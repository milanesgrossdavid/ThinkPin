create type public.content_type as enum (
  'article',
  'video',
  'repository',
  'product',
  'tool',
  'social',
  'document',
  'image',
  'other'
);

create type public.bookmark_content_status as enum (
  'pending',
  'processing',
  'ready',
  'failed'
);

alter table public.bookmarks
  alter column content_type drop default;

alter table public.bookmarks
  drop constraint if exists bookmarks_content_type_check;

alter table public.bookmarks
  alter column content_type type public.content_type
  using content_type::public.content_type;

alter table public.bookmarks
  alter column content_type set default 'other'::public.content_type,
  add column content_status public.bookmark_content_status not null
    default 'pending',
  add column purpose text,
  add column reading_time_minutes integer
    check (reading_time_minutes is null or reading_time_minutes >= 0),
  add column word_count integer
    check (word_count is null or word_count >= 0),
  add column last_opened_at timestamptz;
