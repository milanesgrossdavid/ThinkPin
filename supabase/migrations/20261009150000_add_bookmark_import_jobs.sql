create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source = 'browser_html'),
  status text not null default 'review'
    check (status in ('review', 'processing', 'completed', 'completed_with_errors')),
  total_count integer not null default 0 check (total_count >= 0),
  folders text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_jobs_id_user_id_unique unique (id, user_id)
);

create index import_jobs_user_created_at_idx
  on public.import_jobs (user_id, created_at desc);

create table public.import_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position >= 0),
  url text,
  normalized_url text,
  title text not null default '',
  folder_path text[] not null default '{}',
  status text not null
    check (status in (
      'pending', 'duplicate_file', 'duplicate_library', 'invalid',
      'imported', 'failed'
    )),
  error text,
  bookmark_id uuid,
  created_at timestamptz not null default now(),
  constraint import_items_job_owner_fkey
    foreign key (job_id, user_id)
    references public.import_jobs (id, user_id)
    on delete cascade,
  constraint import_items_bookmark_owner_fkey
    foreign key (bookmark_id, user_id)
    references public.bookmarks (id, user_id)
    on delete set null (bookmark_id),
  constraint import_items_job_position_unique unique (job_id, position)
);

create index import_items_job_status_position_idx
  on public.import_items (job_id, status, position);

alter table public.import_jobs enable row level security;
alter table public.import_items enable row level security;

revoke all on public.import_jobs, public.import_items
  from public, anon, authenticated;

grant select, insert, update, delete on public.import_jobs to authenticated;
grant select, insert, update, delete on public.import_items to authenticated;

create policy "Users can manage their own import jobs"
  on public.import_jobs
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own import items"
  on public.import_items
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger set_import_jobs_updated_at
  before update on public.import_jobs
  for each row
  execute function public.set_updated_at();
