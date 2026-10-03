create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  canonical_url text,
  title text not null,
  description text,
  domain text not null,
  favicon_url text,
  image_url text,
  content_type text not null default 'other'
    check (content_type in (
      'article', 'video', 'repository', 'product', 'tool',
      'social', 'document', 'image', 'other'
    )),
  intent text
    check (intent is null or intent in (
      'research', 'learn', 'reference', 'inspiration', 'buy',
      'project', 'read-later', 'watch-later', 'other'
    )),
  saved_reason text,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookmarks_id_user_id_unique unique (id, user_id)
);

create unique index bookmarks_user_canonical_url_unique
  on public.bookmarks (user_id, canonical_url)
  where canonical_url is not null;

create index bookmarks_user_created_at_idx
  on public.bookmarks (user_id, created_at desc);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  visibility text not null default 'private'
    check (visibility in ('private', 'shared', 'public')),
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_id_user_id_unique unique (id, user_id)
);

create index collections_user_created_at_idx
  on public.collections (user_id, created_at desc);

create table public.bookmark_collections (
  user_id uuid not null references auth.users(id) on delete cascade,
  bookmark_id uuid not null,
  collection_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, bookmark_id, collection_id),
  constraint bookmark_collections_bookmark_owner_fkey
    foreign key (bookmark_id, user_id)
    references public.bookmarks (id, user_id)
    on delete cascade,
  constraint bookmark_collections_collection_owner_fkey
    foreign key (collection_id, user_id)
    references public.collections (id, user_id)
    on delete cascade
);

create index bookmark_collections_collection_idx
  on public.bookmark_collections (user_id, collection_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint tags_id_user_id_unique unique (id, user_id),
  constraint tags_user_slug_unique unique (user_id, slug)
);

create index tags_user_created_at_idx
  on public.tags (user_id, created_at desc);

create table public.bookmark_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  bookmark_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, bookmark_id, tag_id),
  constraint bookmark_tags_bookmark_owner_fkey
    foreign key (bookmark_id, user_id)
    references public.bookmarks (id, user_id)
    on delete cascade,
  constraint bookmark_tags_tag_owner_fkey
    foreign key (tag_id, user_id)
    references public.tags (id, user_id)
    on delete cascade
);

create index bookmark_tags_tag_idx
  on public.bookmark_tags (user_id, tag_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bookmark_id uuid not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_id_user_id_unique unique (id, user_id),
  constraint notes_bookmark_owner_fkey
    foreign key (bookmark_id, user_id)
    references public.bookmarks (id, user_id)
    on delete cascade
);

create index notes_user_bookmark_created_at_idx
  on public.notes (user_id, bookmark_id, created_at);

create table public.bookmark_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bookmark_id uuid not null,
  type text not null
    check (type in (
      'created', 'updated', 'favorited', 'unfavorited', 'archived',
      'unarchived', 'tag-added', 'tag-removed', 'collection-added',
      'collection-removed', 'ai-analyzed'
    )),
  metadata jsonb
    check (metadata is null or jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint bookmark_activity_bookmark_owner_fkey
    foreign key (bookmark_id, user_id)
    references public.bookmarks (id, user_id)
    on delete cascade
);

create index bookmark_activity_user_bookmark_created_at_idx
  on public.bookmark_activity (user_id, bookmark_id, created_at desc);

alter table public.bookmarks enable row level security;
alter table public.collections enable row level security;
alter table public.bookmark_collections enable row level security;
alter table public.tags enable row level security;
alter table public.bookmark_tags enable row level security;
alter table public.notes enable row level security;
alter table public.bookmark_activity enable row level security;

revoke all on public.bookmarks from anon, authenticated;
revoke all on public.collections from anon, authenticated;
revoke all on public.bookmark_collections from anon, authenticated;
revoke all on public.tags from anon, authenticated;
revoke all on public.bookmark_tags from anon, authenticated;
revoke all on public.notes from anon, authenticated;
revoke all on public.bookmark_activity from anon, authenticated;

grant select, insert, update, delete on public.bookmarks to authenticated;
grant select, insert, update, delete on public.collections to authenticated;
grant select, insert, update, delete on public.bookmark_collections to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.bookmark_tags to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert on public.bookmark_activity to authenticated;

create policy "Users can manage their own bookmarks"
  on public.bookmarks
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own collections"
  on public.collections
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own bookmark collections"
  on public.bookmark_collections
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own tags"
  on public.tags
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own bookmark tags"
  on public.bookmark_tags
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own notes"
  on public.notes
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own bookmark activity"
  on public.bookmark_activity
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own bookmark activity"
  on public.bookmark_activity
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger set_bookmarks_updated_at
  before update on public.bookmarks
  for each row
  execute function public.set_updated_at();

create trigger set_collections_updated_at
  before update on public.collections
  for each row
  execute function public.set_updated_at();

create trigger set_notes_updated_at
  before update on public.notes
  for each row
  execute function public.set_updated_at();
