create table public.resurfacing_feedback (
  user_id uuid not null references auth.users(id) on delete cascade,
  bookmark_id uuid not null,
  status text not null check (status in ('rediscovered', 'dismissed')),
  created_at timestamptz not null default now(),
  primary key (user_id, bookmark_id),
  constraint resurfacing_feedback_bookmark_owner_fk
    foreign key (bookmark_id, user_id)
    references public.bookmarks (id, user_id)
    on delete cascade
);

create index resurfacing_feedback_user_status_idx
  on public.resurfacing_feedback (user_id, status, created_at desc);

create or replace function public.search_resurfacing_candidates(
  p_query text,
  p_query_embedding extensions.vector(1536),
  p_limit integer default 40
)
returns table (
  bookmark_id uuid,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with scoped as (
    select bookmark.id, bookmark.search_vector
    from public.bookmarks as bookmark
    where bookmark.user_id = (select auth.uid())
      and bookmark.is_archived = false
      and bookmark.created_at < now() - interval '30 days'
      and (
        bookmark.last_opened_at is null
        or bookmark.last_opened_at < now() - interval '30 days'
      )
  ),
  vector_scores as (
    select
      scoped.id as bookmark_id,
      (1 - min(chunk.embedding <=> p_query_embedding))::double precision
        as similarity
    from scoped
    join public.content_documents as document
      on document.bookmark_id = scoped.id
    join public.content_chunks as chunk
      on chunk.document_id = document.id
    where chunk.embedding is not null
      and p_query_embedding is not null
    group by scoped.id
  ),
  text_hits as (
    select scoped.id as bookmark_id
    from scoped
    where p_query is not null
      and scoped.search_vector @@ websearch_to_tsquery('simple', p_query)
    union
    select relation.bookmark_id
    from public.bookmark_tags as relation
    join public.tags as tag
      on tag.id = relation.tag_id
    join scoped on scoped.id = relation.bookmark_id
    where p_query is not null
      and tag.user_id = (select auth.uid())
      and tag.search_vector @@ websearch_to_tsquery('simple', p_query)
  ),
  combined_scores as (
    select bookmark_id, similarity from vector_scores
    union all
    select bookmark_id, 0.55::double precision from text_hits
  )
  select
    combined_scores.bookmark_id,
    max(combined_scores.similarity)::double precision as similarity
  from combined_scores
  group by combined_scores.bookmark_id
  order by max(combined_scores.similarity) desc
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.search_resurfacing_candidates(
  text, extensions.vector, integer
) from public, anon;
grant execute on function public.search_resurfacing_candidates(
  text, extensions.vector, integer
) to authenticated;

alter table public.resurfacing_feedback enable row level security;
revoke all on public.resurfacing_feedback from public, anon, authenticated;
grant select, insert, update, delete
  on public.resurfacing_feedback to authenticated;

create policy "Users can manage their own resurfacing feedback"
  on public.resurfacing_feedback
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.bookmarks as bookmark
      where bookmark.id = resurfacing_feedback.bookmark_id
        and bookmark.user_id = (select auth.uid())
        and bookmark.is_archived = false
    )
  );
