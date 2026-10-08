create table public.learning_stage_external_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learning_path_id uuid not null,
  stage_id uuid not null,
  url text not null,
  title text not null,
  description text,
  domain text not null,
  content text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint learning_stage_external_sources_stage_path_fk
    foreign key (stage_id, learning_path_id)
    references public.learning_stages (id, learning_path_id)
    on delete cascade,
  constraint learning_stage_external_sources_stage_id_unique
    unique (stage_id, id),
  constraint learning_stage_external_sources_stage_url_unique
    unique (stage_id, url)
);

create index learning_stage_external_sources_stage_position_idx
  on public.learning_stage_external_sources (stage_id, position);

alter table public.learning_progress
  alter column bookmark_id drop not null,
  add column external_source_id uuid,
  add constraint learning_progress_external_resource_fk
    foreign key (stage_id, external_source_id)
    references public.learning_stage_external_sources (stage_id, id)
    on delete cascade,
  add constraint learning_progress_external_stage_resource_unique
    unique (stage_id, external_source_id),
  add constraint learning_progress_one_resource_check
    check (
      (bookmark_id is not null and external_source_id is null)
      or (bookmark_id is null and external_source_id is not null)
    );

alter table public.learning_stage_external_sources enable row level security;

revoke all on public.learning_stage_external_sources
  from public, anon, authenticated;
grant select, insert, update, delete
  on public.learning_stage_external_sources to authenticated;

create policy "Users can manage external sources in their learning paths"
  on public.learning_stage_external_sources
  for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_paths as learning_path
      where learning_path.id = learning_stage_external_sources.learning_path_id
        and learning_path.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.learning_paths as learning_path
      where learning_path.id = learning_stage_external_sources.learning_path_id
        and learning_path.user_id = (select auth.uid())
    )
  );

drop policy "Users can manage progress in their learning paths"
  on public.learning_progress;

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
      where learning_path.id = learning_progress.learning_path_id
        and learning_path.user_id = (select auth.uid())
    )
    and (
      (
        learning_progress.bookmark_id is not null
        and learning_progress.external_source_id is null
        and exists (
          select 1
          from public.learning_stage_bookmarks as stage_bookmark
          join public.bookmarks as bookmark
            on bookmark.id = stage_bookmark.bookmark_id
          where stage_bookmark.stage_id = learning_progress.stage_id
            and stage_bookmark.bookmark_id = learning_progress.bookmark_id
            and bookmark.user_id = (select auth.uid())
        )
      )
      or (
        learning_progress.bookmark_id is null
        and learning_progress.external_source_id is not null
        and exists (
          select 1
          from public.learning_stage_external_sources as external_source
          where external_source.stage_id = learning_progress.stage_id
            and external_source.id = learning_progress.external_source_id
            and external_source.user_id = (select auth.uid())
        )
      )
    )
  );
