insert into storage.buckets (id, name, public)
values ('snapshots', 'snapshots', false)
on conflict (id) do update
set public = excluded.public;

create table public.web_snapshots (
  id uuid primary key default gen_random_uuid(),
  bookmark_id uuid not null
    references public.bookmarks (id)
    on delete cascade,
  storage_path text not null unique,
  text_content text,
  content_hash text,
  captured_at timestamptz not null default now(),
  constraint web_snapshots_storage_path_matches_bookmark
    check ((string_to_array(storage_path, '/'))[2] = bookmark_id::text)
);

create index web_snapshots_bookmark_captured_at_idx
  on public.web_snapshots (bookmark_id, captured_at desc);

alter table public.web_snapshots enable row level security;

revoke all on public.web_snapshots from public, anon, authenticated;
grant select on public.web_snapshots to authenticated;
grant select, insert on public.web_snapshots to service_role;

create policy "Users can read snapshots for their own bookmarks"
  on public.web_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookmarks as bookmark
      where bookmark.id = web_snapshots.bookmark_id
        and bookmark.user_id = (select auth.uid())
    )
  );

create policy "Users can read their own snapshot files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'snapshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.bookmarks as bookmark
      where bookmark.id::text = (storage.foldername(name))[2]
        and bookmark.user_id = (select auth.uid())
    )
  );
