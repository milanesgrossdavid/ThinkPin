create unique index collections_user_name_unique
  on public.collections (user_id, name);

create or replace function public.replace_collection_bookmarks(
  p_collection_id uuid,
  p_bookmark_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_bookmark_count integer;
  v_requested_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.collections
    where id = p_collection_id
      and user_id = v_user_id
  ) then
    raise exception 'Collection not found.';
  end if;

  select count(distinct bookmark_id)
  into v_requested_count
  from unnest(coalesce(p_bookmark_ids, '{}'::uuid[])) as ids(bookmark_id);

  select count(*)
  into v_bookmark_count
  from public.bookmarks
  where user_id = v_user_id
    and id = any(coalesce(p_bookmark_ids, '{}'::uuid[]));

  if v_bookmark_count <> v_requested_count then
    raise exception 'One or more bookmarks could not be found.';
  end if;

  delete from public.bookmark_collections
  where collection_id = p_collection_id;

  insert into public.bookmark_collections (bookmark_id, collection_id)
  select distinct bookmark_id, p_collection_id
  from unnest(coalesce(p_bookmark_ids, '{}'::uuid[])) as ids(bookmark_id);
end;
$$;

revoke execute on function public.replace_collection_bookmarks(uuid, uuid[])
  from public, anon;
grant execute on function public.replace_collection_bookmarks(uuid, uuid[])
  to authenticated;

create or replace function public.replace_bookmark_collection(
  p_bookmark_id uuid,
  p_collection_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.bookmarks
    where id = p_bookmark_id
      and user_id = v_user_id
  ) then
    raise exception 'Bookmark not found.';
  end if;

  if p_collection_id is not null and not exists (
    select 1 from public.collections
    where id = p_collection_id and user_id = v_user_id
  ) then
    raise exception 'Collection not found.';
  end if;

  delete from public.bookmark_collections
  where bookmark_id = p_bookmark_id;

  if p_collection_id is not null then
    insert into public.bookmark_collections (bookmark_id, collection_id)
    values (p_bookmark_id, p_collection_id);
  end if;
end;
$$;

revoke execute on function public.replace_bookmark_collection(uuid, uuid)
  from public, anon;
grant execute on function public.replace_bookmark_collection(uuid, uuid)
  to authenticated;
