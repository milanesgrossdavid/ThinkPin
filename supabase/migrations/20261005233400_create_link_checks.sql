create type public.link_check_status as enum (
  'healthy',
  'redirect',
  'broken',
  'timeout',
  'blocked',
  'unknown'
);

create table public.link_checks (
  id uuid primary key default gen_random_uuid(),
  bookmark_id uuid not null
    references public.bookmarks (id)
    on delete cascade,
  status public.link_check_status not null default 'unknown',
  http_status integer
    check (http_status is null or http_status between 100 and 599),
  redirect_url text,
  checked_at timestamptz not null default now(),
  response_time integer
    check (response_time is null or response_time >= 0),
  error text
);

create index link_checks_bookmark_id_idx
  on public.link_checks (bookmark_id);

create index link_checks_checked_at_idx
  on public.link_checks (checked_at);

alter table public.link_checks enable row level security;

revoke all on public.link_checks from public, anon, authenticated;
grant select on public.link_checks to authenticated;
grant select, insert on public.link_checks to service_role;

create policy "Users can read link checks for their own bookmarks"
  on public.link_checks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookmarks as bookmark
      where bookmark.id = link_checks.bookmark_id
        and bookmark.user_id = (select auth.uid())
    )
  );
