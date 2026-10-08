create or replace function public.search_bookmark_chunks(
  p_query text,
  p_query_embedding extensions.vector(1536),
  p_limit integer default 40
)
returns table (
  chunk_id uuid,
  bookmark_id uuid,
  title text,
  url text,
  domain text,
  content text,
  relevance_score double precision
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with scoped as (
    select
      bookmark.id as bookmark_id,
      bookmark.title,
      bookmark.url,
      bookmark.domain,
      bookmark.description,
      bookmark.content_type::text as content_type,
      bookmark.search_vector as metadata_vector,
      document.id as document_id
    from public.bookmarks as bookmark
    left join public.content_documents as document
      on document.bookmark_id = bookmark.id
    where bookmark.user_id = (select auth.uid())
      and bookmark.is_archived = false
  ),
  query_tokens as (
    select distinct token
    from regexp_split_to_table(
      lower(coalesce(p_query, '')),
      '[^[:alnum:]]+'
    ) as words(token)
    where (length(token) > 2 or token in ('ai', 'ia', 'js'))
      and token not in (
        'and', 'are', 'did', 'for', 'from', 'have', 'how', 'into',
        'que', 'qué', 'con', 'las', 'los', 'una', 'uno', 'del',
        'por', 'para', 'sobre', 'the', 'this', 'that', 'what',
        'when', 'where', 'which', 'who', 'with', 'your', 'you',
        'saved', 'guardé', 'guarde', 'tengo', 'tiene', 'mis',
        'mías', 'mios'
      )
  ),
  expanded_tokens as (
    select token from query_tokens
    union
    select case
      when token in ('repositorio', 'repositorios', 'repos', 'repositories')
        then 'repository'
      when token in ('repository', 'repositories', 'repositorio', 'repositorios')
        then 'github'
      else null
    end
    from query_tokens
  ),
  query_data as (
    select to_tsquery(
      'simple',
      string_agg(token || ':*', ' | ')
    ) as tsquery
    from expanded_tokens
    where token is not null
  ),
  metadata_hits as (
    select
      scoped.bookmark_id,
      ts_rank_cd(
        to_tsvector(
          'simple',
          concat_ws(
            ' ',
            scoped.title,
            scoped.url,
            scoped.domain,
            scoped.description,
            scoped.content_type
          )
        ),
        query_data.tsquery
      )::double precision as score
    from scoped
    cross join query_data
    where query_data.tsquery is not null
      and (
        to_tsvector(
          'simple',
          concat_ws(
            ' ',
            scoped.title,
            scoped.url,
            scoped.domain,
            scoped.description,
            scoped.content_type
          )
        ) @@ query_data.tsquery
        or (
          exists (
            select 1 from query_tokens where token = 'github'
          )
          and scoped.domain ilike '%github%'
        )
        or (
          exists (
            select 1
            from query_tokens
            where token in (
              'repositorio', 'repositorios', 'repos', 'repository', 'repositories'
            )
          )
          and scoped.content_type = 'repository'
        )
      )
  ),
  metadata_candidates as (
    select
      chunk.id as chunk_id,
      scoped.bookmark_id,
      scoped.title,
      scoped.url,
      scoped.domain,
      concat_ws(
        E'\n',
        concat('Saved bookmark: ', scoped.title),
        concat('Type: ', coalesce(scoped.content_type, 'unknown')),
        concat('Domain: ', scoped.domain),
        concat('URL: ', scoped.url),
        case
          when scoped.description is not null
            then concat('Description: ', scoped.description)
        end,
        case
          when chunk.content is not null
            then concat('Saved page excerpt: ', chunk.content)
        end
      ) as content,
      (2.0 + metadata_hits.score)::double precision as score
    from metadata_hits
    join scoped using (bookmark_id)
    left join lateral (
      select candidate.id, candidate.content
      from public.content_chunks as candidate
      where candidate.document_id = scoped.document_id
      order by candidate.chunk_index
      limit 1
    ) as chunk on true
  ),
  full_text_ranked as (
    select
      chunk.id as chunk_id,
      row_number() over (
        order by ts_rank_cd(chunk.search_vector, query_data.tsquery) desc
      ) as rank_position
    from public.content_chunks as chunk
    join scoped on scoped.document_id = chunk.document_id
    cross join query_data
    where query_data.tsquery is not null
      and chunk.search_vector @@ query_data.tsquery
    order by ts_rank_cd(chunk.search_vector, query_data.tsquery) desc
    limit 40
  ),
  vector_ranked as (
    select
      chunk.id as chunk_id,
      row_number() over (
        order by chunk.embedding <=> p_query_embedding
      ) as rank_position
    from public.content_chunks as chunk
    join scoped on scoped.document_id = chunk.document_id
    where p_query_embedding is not null
      and chunk.embedding is not null
      and chunk.embedding <=> p_query_embedding <= 0.65
    order by chunk.embedding <=> p_query_embedding
    limit 40
  ),
  ranked_chunks as (
    select
      chunk.id as chunk_id,
      bookmark.id as bookmark_id,
      bookmark.title,
      bookmark.url,
      bookmark.domain,
      chunk.content,
      sum(candidate.score)::double precision as score
    from (
      select
        full_text_ranked.chunk_id,
        1.0 / (60 + full_text_ranked.rank_position) as score
      from full_text_ranked
      union all
      select
        vector_ranked.chunk_id,
        1.0 / (60 + vector_ranked.rank_position) as score
      from vector_ranked
    ) as candidate
    join public.content_chunks as chunk on chunk.id = candidate.chunk_id
    join public.content_documents as document on document.id = chunk.document_id
    join public.bookmarks as bookmark on bookmark.id = document.bookmark_id
    group by chunk.id, bookmark.id
  ),
  candidates as (
    select * from metadata_candidates
    union all
    select * from ranked_chunks
  ),
  deduplicated as (
    select
      candidates.*,
      row_number() over (
        partition by coalesce(candidates.chunk_id, candidates.bookmark_id)
        order by candidates.score desc
      ) as duplicate_rank
    from candidates
  )
  select
    deduplicated.chunk_id,
    deduplicated.bookmark_id,
    deduplicated.title,
    deduplicated.url,
    deduplicated.domain,
    deduplicated.content,
    deduplicated.score
  from deduplicated
  where deduplicated.duplicate_rank = 1
  order by deduplicated.score desc
  limit greatest(1, least(p_limit, 40));
$$;

revoke all on function public.search_bookmark_chunks(
  text, extensions.vector, integer
) from public, anon;
grant execute on function public.search_bookmark_chunks(
  text, extensions.vector, integer
) to authenticated;
