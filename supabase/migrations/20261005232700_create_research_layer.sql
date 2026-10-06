create type public.research_project_status as enum (
  'active',
  'completed',
  'archived'
);

create table public.research_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status public.research_project_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_projects_id_user_id_unique unique (id, user_id)
);

create index research_projects_user_updated_at_idx
  on public.research_projects (user_id, updated_at desc);

create table public.research_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.research_projects (id)
    on delete cascade,
  bookmark_id uuid not null
    references public.bookmarks (id)
    on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  constraint research_sources_project_bookmark_unique
    unique (project_id, bookmark_id)
);

create index research_sources_bookmark_id_idx
  on public.research_sources (bookmark_id);

create table public.research_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references public.research_projects (id)
    on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index research_notes_project_created_at_idx
  on public.research_notes (project_id, created_at);

alter table public.research_projects enable row level security;
alter table public.research_sources enable row level security;
alter table public.research_notes enable row level security;

revoke all on public.research_projects from public, anon, authenticated;
revoke all on public.research_sources from public, anon, authenticated;
revoke all on public.research_notes from public, anon, authenticated;

grant select, insert, update, delete
  on public.research_projects to authenticated;
grant select, insert, update, delete
  on public.research_sources to authenticated;
grant select, insert, update, delete
  on public.research_notes to authenticated;

create policy "Users can manage their own research projects"
  on public.research_projects
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage sources in their own research projects"
  on public.research_sources
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.research_projects as project
      join public.bookmarks as bookmark
        on bookmark.id = research_sources.bookmark_id
      where project.id = research_sources.project_id
        and project.user_id = (select auth.uid())
        and bookmark.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.research_projects as project
      join public.bookmarks as bookmark
        on bookmark.id = research_sources.bookmark_id
      where project.id = research_sources.project_id
        and project.user_id = (select auth.uid())
        and bookmark.user_id = (select auth.uid())
    )
  );

create policy "Users can manage notes in their own research projects"
  on public.research_notes
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.research_projects as project
      where project.id = research_notes.project_id
        and project.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.research_projects as project
      where project.id = research_notes.project_id
        and project.user_id = (select auth.uid())
    )
  );

create trigger set_research_projects_updated_at
  before update on public.research_projects
  for each row
  execute function public.set_updated_at();

create trigger set_research_notes_updated_at
  before update on public.research_notes
  for each row
  execute function public.set_updated_at();
