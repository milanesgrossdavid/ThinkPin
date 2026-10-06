drop index if exists public.bookmark_collections_collection_idx;
drop index if exists public.bookmark_tags_tag_idx;

drop policy "Users can manage their own bookmark collections"
  on public.bookmark_collections;
drop policy "Users can manage their own bookmark tags"
  on public.bookmark_tags;

alter table public.bookmark_collections
  drop constraint bookmark_collections_pkey,
  drop constraint bookmark_collections_bookmark_owner_fkey,
  drop constraint bookmark_collections_collection_owner_fkey,
  drop column user_id,
  add constraint bookmark_collections_pkey
    primary key (bookmark_id, collection_id),
  add constraint bookmark_collections_bookmark_id_fkey
    foreign key (bookmark_id)
    references public.bookmarks (id)
    on delete cascade,
  add constraint bookmark_collections_collection_id_fkey
    foreign key (collection_id)
    references public.collections (id)
    on delete cascade;

create index bookmark_collections_collection_id_idx
  on public.bookmark_collections (collection_id);

alter table public.bookmark_tags
  drop constraint bookmark_tags_pkey,
  drop constraint bookmark_tags_bookmark_owner_fkey,
  drop constraint bookmark_tags_tag_owner_fkey,
  drop column user_id,
  add constraint bookmark_tags_pkey
    primary key (bookmark_id, tag_id),
  add constraint bookmark_tags_bookmark_id_fkey
    foreign key (bookmark_id)
    references public.bookmarks (id)
    on delete cascade,
  add constraint bookmark_tags_tag_id_fkey
    foreign key (tag_id)
    references public.tags (id)
    on delete cascade;

create index bookmark_tags_tag_id_idx
  on public.bookmark_tags (tag_id);

create policy "Users can read their own bookmark collections"
  on public.bookmark_collections
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookmarks as bookmark
      where bookmark.id = bookmark_id
        and bookmark.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.collections as collection
      where collection.id = collection_id
        and collection.user_id = (select auth.uid())
    )
  );

create policy "Users can add their own bookmark collections"
  on public.bookmark_collections
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.bookmarks as bookmark
      where bookmark.id = bookmark_id
        and bookmark.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.collections as collection
      where collection.id = collection_id
        and collection.user_id = (select auth.uid())
    )
  );

create policy "Users can remove their own bookmark collections"
  on public.bookmark_collections
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.bookmarks as bookmark
      where bookmark.id = bookmark_id
        and bookmark.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.collections as collection
      where collection.id = collection_id
        and collection.user_id = (select auth.uid())
    )
  );

create policy "Users can read their own bookmark tags"
  on public.bookmark_tags
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookmarks as bookmark
      where bookmark.id = bookmark_id
        and bookmark.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.tags as tag
      where tag.id = tag_id
        and tag.user_id = (select auth.uid())
    )
  );

create policy "Users can add their own bookmark tags"
  on public.bookmark_tags
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.bookmarks as bookmark
      where bookmark.id = bookmark_id
        and bookmark.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.tags as tag
      where tag.id = tag_id
        and tag.user_id = (select auth.uid())
    )
  );

create policy "Users can remove their own bookmark tags"
  on public.bookmark_tags
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.bookmarks as bookmark
      where bookmark.id = bookmark_id
        and bookmark.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.tags as tag
      where tag.id = tag_id
        and tag.user_id = (select auth.uid())
    )
  );

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bookmark_id uuid not null,
  selected_text text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint highlights_bookmark_owner_fkey
    foreign key (bookmark_id, user_id)
    references public.bookmarks (id, user_id)
    on delete cascade
);

create index highlights_user_bookmark_created_at_idx
  on public.highlights (user_id, bookmark_id, created_at);

alter table public.highlights enable row level security;

revoke all on public.highlights from public, anon, authenticated;
grant select, insert, update, delete on public.highlights to authenticated;

create policy "Users can manage their own highlights"
  on public.highlights
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
