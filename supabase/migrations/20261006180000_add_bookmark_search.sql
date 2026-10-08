alter table public.bookmarks
  add column search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(domain, '')), 'B')
  ) stored;

create index bookmarks_search_vector_idx
  on public.bookmarks using gin (search_vector);

alter table public.tags
  add column search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(name, ''))
  ) stored;

create index tags_search_vector_idx
  on public.tags using gin (search_vector);

alter table public.notes
  add column search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(content, ''))
  ) stored;

create index notes_search_vector_idx
  on public.notes using gin (search_vector);

alter table public.content_documents
  add column search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(content, ''))
  ) stored;

create index content_documents_search_vector_idx
  on public.content_documents using gin (search_vector);

alter table public.content_chunks
  add column embedding extensions.vector(1536);

create index content_chunks_embedding_idx
  on public.content_chunks
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

create or replace function public.search_bookmarks(
  p_query text,
  p_mode text,
  p_query_embedding extensions.vector(1536) default null,
  p_content_type text default null,
  p_is_favorite boolean default null,
  p_is_read boolean default null,
  p_collection text default null,
  p_tag text default null,
  p_created_after timestamptz default null,
  p_limit integer default 30
)
returns table (
  id uuid,
  url text,
  canonical_url text,
  title text,
  description text,
  domain text,
  favicon_url text,
  image_url text,
  content_type text,
  intent text,
  is_favorite boolean,
  is_archived boolean,
  is_read boolean,
  content_status text,
  created_at timestamptz,
  tags text[],
  collection text,
  notes text,
  score double precision,
  matched_fields text[]
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with query_data as (
    select websearch_to_tsquery('simple', trim(p_query)) as tsquery
  ),
  scoped as (
    select bookmark.*
    from public.bookmarks as bookmark
    where bookmark.user_id = (select auth.uid())
      and bookmark.is_archived = false
      and (p_content_type is null or bookmark.content_type::text = p_content_type)
      and (p_is_favorite is null or bookmark.is_favorite = p_is_favorite)
      and (p_is_read is null or bookmark.is_read = p_is_read)
      and (p_created_after is null or bookmark.created_at >= p_created_after)
      and (
        p_collection is null
        or exists (
          select 1
          from public.bookmark_collections as relation
          join public.collections as collection
            on collection.id = relation.collection_id
          where relation.bookmark_id = bookmark.id
            and collection.name = p_collection
            and collection.user_id = (select auth.uid())
        )
      )
      and (
        p_tag is null
        or exists (
          select 1
          from public.bookmark_tags as relation
          join public.tags as tag on tag.id = relation.tag_id
          where relation.bookmark_id = bookmark.id
            and tag.name = p_tag
            and tag.user_id = (select auth.uid())
        )
      )
  ),
  searchable as (
    select
      bookmark.*,
      coalesce(tag_data.names, array[]::text[]) as tag_names,
      coalesce(tag_data.text, '') as tag_text,
      coalesce(note_data.content, '') as note_text,
      coalesce(document.content, '') as document_text,
      collection_data.name as collection_name
    from scoped as bookmark
    left join lateral (
      select
        array_agg(tag.name order by tag.name) as names,
        string_agg(tag.name, ' ') as text
      from public.bookmark_tags as relation
      join public.tags as tag on tag.id = relation.tag_id
      where relation.bookmark_id = bookmark.id
        and tag.user_id = (select auth.uid())
    ) as tag_data on true
    left join lateral (
      select note.content
      from public.notes as note
      where note.bookmark_id = bookmark.id
        and note.user_id = (select auth.uid())
      order by note.updated_at desc
      limit 1
    ) as note_data on true
    left join public.content_documents as document
      on document.bookmark_id = bookmark.id
    left join lateral (
      select collection.name
      from public.bookmark_collections as relation
      join public.collections as collection
        on collection.id = relation.collection_id
      where relation.bookmark_id = bookmark.id
        and collection.user_id = (select auth.uid())
      order by collection.name
      limit 1
    ) as collection_data on true
  ),
  keyword_hits as (
    select
      searchable.id,
      ts_rank_cd(
        to_tsvector('simple', concat_ws(' ', searchable.title, searchable.domain)),
        query_data.tsquery
      )::double precision as score,
      array_remove(array[
        case when to_tsvector('simple', searchable.title) @@ query_data.tsquery then 'title' end,
        case when to_tsvector('simple', searchable.domain) @@ query_data.tsquery then 'domain' end
      ], null)::text[] as matched_fields
    from searchable
    cross join query_data
    where p_mode = 'keyword'
      and to_tsvector('simple', concat_ws(' ', searchable.title, searchable.domain))
        @@ query_data.tsquery
  ),
  full_text_hits_raw as (
    select
      bookmark.id,
      ts_rank_cd(bookmark.search_vector, query_data.tsquery)::double precision as score,
      array_remove(array[
        case when to_tsvector('simple', bookmark.title) @@ query_data.tsquery then 'title' end,
        case when to_tsvector('simple', coalesce(bookmark.description, '')) @@ query_data.tsquery then 'description' end,
        case when to_tsvector('simple', bookmark.domain) @@ query_data.tsquery then 'domain' end
      ], null)::text[] as matched_fields
    from scoped as bookmark
    cross join query_data
    where p_mode = 'full-text'
      and bookmark.search_vector @@ query_data.tsquery
    union all
    select
      relation.bookmark_id,
      ts_rank_cd(setweight(tag.search_vector, 'A'), query_data.tsquery)::double precision,
      array['tags']::text[]
    from public.bookmark_tags as relation
    join public.tags as tag on tag.id = relation.tag_id
    join scoped as bookmark on bookmark.id = relation.bookmark_id
    cross join query_data
    where p_mode = 'full-text'
      and tag.search_vector @@ query_data.tsquery
      and tag.user_id = (select auth.uid())
    union all
    select
      note.bookmark_id,
      ts_rank_cd(setweight(note.search_vector, 'B'), query_data.tsquery)::double precision,
      array['notes']::text[]
    from public.notes as note
    join scoped as bookmark on bookmark.id = note.bookmark_id
    cross join query_data
    where p_mode = 'full-text'
      and note.search_vector @@ query_data.tsquery
      and note.user_id = (select auth.uid())
    union all
    select
      document.bookmark_id,
      ts_rank_cd(setweight(document.search_vector, 'C'), query_data.tsquery)::double precision,
      array['content']::text[]
    from public.content_documents as document
    join scoped as bookmark on bookmark.id = document.bookmark_id
    cross join query_data
    where p_mode = 'full-text'
      and document.search_vector @@ query_data.tsquery
  ),
  full_text_hits as (
    select
      full_text_hits_raw.id,
      sum(full_text_hits_raw.score)::double precision as score,
      array_agg(distinct fields.field) as matched_fields
    from full_text_hits_raw
    cross join lateral unnest(full_text_hits_raw.matched_fields) as fields(field)
    group by full_text_hits_raw.id
  ),
  vector_candidates as (
    select
      document.bookmark_id,
      chunk.embedding <=> p_query_embedding as distance
    from public.content_chunks as chunk
    join public.content_documents as document
      on document.id = chunk.document_id
    join searchable
      on searchable.id = document.bookmark_id
    where p_mode = 'semantic'
      and p_query_embedding is not null
      and chunk.embedding is not null
    order by chunk.embedding <=> p_query_embedding
    limit greatest(1, least(p_limit, 100)) * 20
  ),
  semantic_hits as (
    select
      vector_candidates.bookmark_id as id,
      (1 - min(vector_candidates.distance))::double precision as score,
      array['content']::text[] as matched_fields
    from vector_candidates
    group by vector_candidates.bookmark_id
  ),
  hits as (
    select * from keyword_hits
    union all
    select * from full_text_hits
    union all
    select * from semantic_hits
  )
  select
    searchable.id,
    searchable.url,
    searchable.canonical_url,
    searchable.title,
    searchable.description,
    searchable.domain,
    searchable.favicon_url,
    searchable.image_url,
    searchable.content_type::text,
    searchable.intent::text,
    searchable.is_favorite,
    searchable.is_archived,
    searchable.is_read,
    searchable.content_status::text,
    searchable.created_at,
    searchable.tag_names,
    searchable.collection_name,
    nullif(searchable.note_text, ''),
    hits.score,
    hits.matched_fields
  from hits
  join searchable on searchable.id = hits.id
  order by hits.score desc, searchable.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.search_bookmarks(
  text, text, extensions.vector, text, boolean, boolean, text, text, timestamptz, integer
) from public, anon;
grant execute on function public.search_bookmarks(
  text, text, extensions.vector, text, boolean, boolean, text, text, timestamptz, integer
) to authenticated;
