create type public.collection_visibility as enum (
  'private',
  'shared',
  'public'
);

alter table public.collections
  alter column visibility drop default;

alter table public.collections
  drop constraint if exists collections_visibility_check;

alter table public.collections
  alter column visibility type public.collection_visibility
  using visibility::public.collection_visibility;

alter table public.collections
  alter column visibility
    set default 'private'::public.collection_visibility,
  add column icon text,
  add column color text;
