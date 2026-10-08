create type public.learning_path_status as enum (
  'active',
  'completed',
  'archived'
);

create type public.learning_progress_status as enum (
  'not_started',
  'studied',
  'mastered'
);

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  topic text not null,
  status public.learning_path_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_paths_id_user_id_unique unique (id, user_id)
);

create index learning_paths_user_updated_at_idx
  on public.learning_paths (user_id, updated_at desc);

create table public.learning_stages (
  id uuid primary key default gen_random_uuid(),
  learning_path_id uuid not null
    references public.learning_paths (id)
    on delete cascade,
  title text not null,
  description text not null default '',
  position integer not null,
  constraint learning_stages_path_position_unique
    unique (learning_path_id, position),
  constraint learning_stages_id_path_unique
    unique (id, learning_path_id)
);

create table public.learning_stage_bookmarks (
  id uuid primary key default gen_random_uuid(),
  learning_path_id uuid not null,
  stage_id uuid not null,
  bookmark_id uuid not null references public.bookmarks (id) on delete cascade,
  position integer not null default 0,
  constraint learning_stage_bookmarks_stage_path_fk
    foreign key (stage_id, learning_path_id)
    references public.learning_stages (id, learning_path_id)
    on delete cascade,
  constraint learning_stage_bookmarks_stage_bookmark_unique
    unique (stage_id, bookmark_id),
  constraint learning_stage_bookmarks_stage_bookmark_id_unique
    unique (stage_id, bookmark_id, id)
);

create table public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learning_path_id uuid not null,
  stage_id uuid not null,
  bookmark_id uuid not null,
  status public.learning_progress_status not null default 'not_started',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint learning_progress_path_user_fk
    foreign key (learning_path_id, user_id)
    references public.learning_paths (id, user_id)
    on delete cascade,
  constraint learning_progress_resource_fk
    foreign key (stage_id, bookmark_id)
    references public.learning_stage_bookmarks (stage_id, bookmark_id)
    on delete cascade,
  constraint learning_progress_stage_path_fk
    foreign key (stage_id, learning_path_id)
    references public.learning_stages (id, learning_path_id)
    on delete cascade,
  constraint learning_progress_stage_bookmark_unique
    unique (stage_id, bookmark_id),
  constraint learning_progress_completion_check
    check (
      (status = 'not_started' and completed_at is null)
      or (status in ('studied', 'mastered') and completed_at is not null)
    )
);

create index learning_stages_path_position_idx
  on public.learning_stages (learning_path_id, position);
create index learning_stage_bookmarks_stage_position_idx
  on public.learning_stage_bookmarks (stage_id, position);
create index learning_stage_bookmarks_bookmark_id_idx
  on public.learning_stage_bookmarks (bookmark_id);
create index learning_progress_user_path_status_idx
  on public.learning_progress (user_id, learning_path_id, status);

alter table public.learning_paths enable row level security;
alter table public.learning_stages enable row level security;
alter table public.learning_stage_bookmarks enable row level security;
alter table public.learning_progress enable row level security;

revoke all on public.learning_paths from public, anon, authenticated;
revoke all on public.learning_stages from public, anon, authenticated;
revoke all on public.learning_stage_bookmarks from public, anon, authenticated;
revoke all on public.learning_progress from public, anon, authenticated;

grant select, insert, update, delete
  on public.learning_paths to authenticated;
grant select, insert, update, delete
  on public.learning_stages to authenticated;
grant select, insert, update, delete
  on public.learning_stage_bookmarks to authenticated;
grant select, insert, update, delete
  on public.learning_progress to authenticated;

create policy "Users can manage their own learning paths"
  on public.learning_paths
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage stages in their learning paths"
  on public.learning_stages
  for all
  to authenticated
  using (
    exists (
      select 1 from public.learning_paths as learning_path
      where learning_path.id = learning_stages.learning_path_id
        and learning_path.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.learning_paths as learning_path
      where learning_path.id = learning_stages.learning_path_id
        and learning_path.user_id = (select auth.uid())
    )
  );

create policy "Users can manage bookmarks in their learning paths"
  on public.learning_stage_bookmarks
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.learning_paths as learning_path
      join public.bookmarks as bookmark
        on bookmark.id = learning_stage_bookmarks.bookmark_id
      where learning_path.id = learning_stage_bookmarks.learning_path_id
        and learning_path.user_id = (select auth.uid())
        and bookmark.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.learning_paths as learning_path
      join public.bookmarks as bookmark
        on bookmark.id = learning_stage_bookmarks.bookmark_id
      where learning_path.id = learning_stage_bookmarks.learning_path_id
        and learning_path.user_id = (select auth.uid())
        and bookmark.user_id = (select auth.uid())
    )
  );

create policy "Users can manage progress in their learning paths"
  on public.learning_progress
  for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_paths as learning_path
      where learning_path.id = learning_progress.learning_path_id
        and learning_path.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_paths as learning_path
      join public.bookmarks as bookmark
        on bookmark.id = learning_progress.bookmark_id
      where learning_path.id = learning_progress.learning_path_id
        and learning_path.user_id = (select auth.uid())
        and bookmark.user_id = (select auth.uid())
    )
  );

create trigger set_learning_paths_updated_at
  before update on public.learning_paths
  for each row
  execute function public.set_updated_at();

create trigger set_learning_progress_updated_at
  before update on public.learning_progress
  for each row
  execute function public.set_updated_at();
