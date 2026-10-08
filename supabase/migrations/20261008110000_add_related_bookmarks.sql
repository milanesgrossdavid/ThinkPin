create or replace function public.find_related_bookmarks(
  p_bookmark_id uuid,
  p_limit integer default 6,
  p_min_similarity double precision default 0.35
)
returns table (
  id uuid,
  title text,
  description text,
  url text,
  domain text,
  image_url text,
  content_type text,
  created_at timestamptz,
  tags text[],
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with current_bookmark as (
    select bookmark.id, bookmark.user_id
    from public.bookmarks as bookmark
    where bookmark.id = p_bookmark_id
      and bookmark.user_id = (select auth.uid())
      and bookmark.is_archived = false
  ),
  ranked_target_vectors as (
    select
      chunk.embedding,
      chunk.chunk_index,
      ntile(8) over (order by chunk.chunk_index) as bucket
    from current_bookmark
    join public.content_documents as document
      on document.bookmark_id = current_bookmark.id
    join public.content_chunks as chunk
      on chunk.document_id = document.id
    where chunk.embedding is not null
  ),
  target_vectors as (
    select distinct on (bucket) embedding
    from ranked_target_vectors
    order by bucket, chunk_index
  ),
  candidate_chunks as (
    select
      bookmark.id,
      bookmark.title,
      bookmark.description,
      bookmark.url,
      bookmark.domain,
      bookmark.image_url,
      bookmark.content_type::text as content_type,
      bookmark.created_at,
      chunk.embedding
    from public.bookmarks as bookmark
    join public.content_documents as document
      on document.bookmark_id = bookmark.id
    join public.content_chunks as chunk
      on chunk.document_id = document.id
    where bookmark.user_id = (select auth.uid())
      and bookmark.id <> p_bookmark_id
      and bookmark.is_archived = false
      and chunk.embedding is not null
  ),
  scored as (
    select
      candidate_chunks.id,
      candidate_chunks.title,
      candidate_chunks.description,
      candidate_chunks.url,
      candidate_chunks.domain,
      candidate_chunks.image_url,
      candidate_chunks.content_type,
      candidate_chunks.created_at,
      greatest(
        0.0,
        least(1.0, max(1.0 - (candidate_chunks.embedding <=> target_vectors.embedding)))
      )::double precision as similarity
    from candidate_chunks
    cross join target_vectors
    where candidate_chunks.embedding <=> target_vectors.embedding
      <= 1.0 - greatest(0.0, least(1.0, p_min_similarity))
    group by
      candidate_chunks.id,
      candidate_chunks.title,
      candidate_chunks.description,
      candidate_chunks.url,
      candidate_chunks.domain,
      candidate_chunks.image_url,
      candidate_chunks.content_type,
      candidate_chunks.created_at
  )
  select
    scored.id,
    scored.title,
    scored.description,
    scored.url,
    scored.domain,
    scored.image_url,
    scored.content_type,
    scored.created_at,
    array(
      select tag.name
      from public.bookmark_tags as relation
      join public.tags as tag
        on tag.id = relation.tag_id
       and tag.user_id = (select auth.uid())
      where relation.bookmark_id = scored.id
      order by tag.name
    ) as tags,
    scored.similarity
  from scored
  order by scored.similarity desc, scored.created_at desc
  limit greatest(1, least(p_limit, 6));
$$;

revoke all on function public.find_related_bookmarks(
  uuid, integer, double precision
) from public, anon;
grant execute on function public.find_related_bookmarks(
  uuid, integer, double precision
) to authenticated;
