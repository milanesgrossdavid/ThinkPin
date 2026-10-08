alter type public.ai_usage_action_type add value if not exists 'ai_answer';

alter table public.content_chunks
  add column search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(content, ''))
  ) stored;

create index content_chunks_search_vector_idx
  on public.content_chunks using gin (search_vector);

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
  with scoped_chunks as (
    select
      chunk.id as chunk_id,
      bookmark.id as bookmark_id,
      bookmark.title,
      bookmark.url,
      bookmark.domain,
      chunk.content,
      chunk.search_vector,
      chunk.embedding
    from public.content_chunks as chunk
    join public.content_documents as document
      on document.id = chunk.document_id
    join public.bookmarks as bookmark
      on bookmark.id = document.bookmark_id
    where bookmark.user_id = (select auth.uid())
      and bookmark.is_archived = false
      and bookmark.content_status = 'ready'
  ),
  query_data as (
    select websearch_to_tsquery('simple', trim(p_query)) as tsquery
  ),
  full_text_ranked as (
    select
      scoped_chunks.chunk_id,
      row_number() over (
        order by ts_rank_cd(scoped_chunks.search_vector, query_data.tsquery) desc
      ) as rank_position
    from scoped_chunks
    cross join query_data
    where scoped_chunks.search_vector @@ query_data.tsquery
    order by ts_rank_cd(scoped_chunks.search_vector, query_data.tsquery) desc
    limit 40
  ),
  vector_ranked as (
    select
      scoped_chunks.chunk_id,
      row_number() over (
        order by scoped_chunks.embedding <=> p_query_embedding
      ) as rank_position
    from scoped_chunks
    where p_query_embedding is not null
      and scoped_chunks.embedding is not null
      and scoped_chunks.embedding <=> p_query_embedding <= 0.65
    order by scoped_chunks.embedding <=> p_query_embedding
    limit 40
  ),
  fused as (
    select
      full_text_ranked.chunk_id,
      1.0 / (60 + full_text_ranked.rank_position) as score
    from full_text_ranked
    union all
    select
      vector_ranked.chunk_id,
      1.0 / (60 + vector_ranked.rank_position) as score
    from vector_ranked
  ),
  ranked as (
    select
      fused.chunk_id,
      (sum(fused.score) / (2.0 / 61.0))::double precision as relevance_score
    from fused
    group by fused.chunk_id
  )
  select
    scoped_chunks.chunk_id,
    scoped_chunks.bookmark_id,
    scoped_chunks.title,
    scoped_chunks.url,
    scoped_chunks.domain,
    scoped_chunks.content,
    ranked.relevance_score
  from ranked
  join scoped_chunks using (chunk_id)
  order by ranked.relevance_score desc
  limit greatest(1, least(p_limit, 40));
$$;

revoke all on function public.search_bookmark_chunks(
  text, extensions.vector, integer
) from public, anon;
grant execute on function public.search_bookmark_chunks(
  text, extensions.vector, integer
) to authenticated;
