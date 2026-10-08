alter table public.link_checks
  add column checked_url text;

create index link_checks_bookmark_checked_at_idx
  on public.link_checks (bookmark_id, checked_at desc, id desc);

create or replace function public.claim_link_health_batch(p_limit integer default 100)
returns table (
  bookmark_id uuid,
  user_id uuid,
  url text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select bookmark.id, bookmark.user_id, bookmark.url
  from public.bookmarks as bookmark
  left join lateral (
    select check_record.checked_at, check_record.checked_url
    from public.link_checks as check_record
    where check_record.bookmark_id = bookmark.id
    order by check_record.checked_at desc, check_record.id desc
    limit 1
  ) as latest on true
  where bookmark.is_archived = false
    and (
      latest.checked_at is null
      or latest.checked_url is distinct from bookmark.url
      or latest.checked_at <= now() - interval '7 days'
    )
  order by latest.checked_at asc nulls first, bookmark.created_at asc
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.claim_link_health_batch(integer)
  from public, anon, authenticated;
grant execute on function public.claim_link_health_batch(integer)
  to service_role;

create or replace function public.get_user_library_health_summary()
returns table (
  total bigint,
  healthy bigint,
  redirects bigint,
  broken bigint,
  timeouts bigint,
  blocked bigint,
  unknown bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with latest_checks as (
    select distinct on (check_record.bookmark_id)
      check_record.bookmark_id,
      check_record.status,
      check_record.checked_url
    from public.link_checks as check_record
    join public.bookmarks as bookmark
      on bookmark.id = check_record.bookmark_id
    where bookmark.user_id = (select auth.uid())
      and bookmark.is_archived = false
    order by check_record.bookmark_id, check_record.checked_at desc,
      check_record.id desc
  ),
  library as (
    select
      bookmark.id,
      case
        when latest_checks.checked_url = bookmark.url then latest_checks.status
        else null
      end as status
    from public.bookmarks as bookmark
    left join latest_checks on latest_checks.bookmark_id = bookmark.id
    where bookmark.user_id = (select auth.uid())
      and bookmark.is_archived = false
  )
  select
    count(*)::bigint,
    count(*) filter (where status = 'healthy')::bigint,
    count(*) filter (where status = 'redirect')::bigint,
    count(*) filter (where status = 'broken')::bigint,
    count(*) filter (where status = 'timeout')::bigint,
    count(*) filter (where status = 'blocked')::bigint,
    count(*) filter (where status is null or status = 'unknown')::bigint
  from library;
$$;

revoke all on function public.get_user_library_health_summary()
  from public, anon;
grant execute on function public.get_user_library_health_summary()
  to authenticated;

create or replace function public.get_user_library_health_bookmarks(
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  bookmark_id uuid,
  title text,
  url text,
  domain text,
  created_at timestamptz,
  status public.link_check_status,
  http_status integer,
  redirect_url text,
  checked_at timestamptz,
  response_time integer,
  error text,
  total_matching bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with latest_checks as (
    select distinct on (check_record.bookmark_id)
      check_record.bookmark_id,
      check_record.status,
      check_record.checked_url,
      check_record.http_status,
      check_record.redirect_url,
      check_record.checked_at,
      check_record.response_time,
      check_record.error
    from public.link_checks as check_record
    join public.bookmarks as bookmark
      on bookmark.id = check_record.bookmark_id
    where bookmark.user_id = (select auth.uid())
      and bookmark.is_archived = false
    order by check_record.bookmark_id, check_record.checked_at desc,
      check_record.id desc
  ),
  library as (
    select
      bookmark.id as bookmark_id,
      bookmark.title,
      bookmark.url,
      bookmark.domain,
      bookmark.created_at,
      case
        when latest_checks.checked_url = bookmark.url then latest_checks.status
        else null
      end as status,
      case
        when latest_checks.checked_url = bookmark.url then latest_checks.http_status
        else null
      end as http_status,
      case
        when latest_checks.checked_url = bookmark.url then latest_checks.redirect_url
        else null
      end as redirect_url,
      case
        when latest_checks.checked_url = bookmark.url then latest_checks.checked_at
        else null
      end as checked_at,
      case
        when latest_checks.checked_url = bookmark.url then latest_checks.response_time
        else null
      end as response_time,
      case
        when latest_checks.checked_url = bookmark.url then latest_checks.error
        else null
      end as error
    from public.bookmarks as bookmark
    left join latest_checks on latest_checks.bookmark_id = bookmark.id
    where bookmark.user_id = (select auth.uid())
      and bookmark.is_archived = false
  ),
  filtered as (
    select *
    from library
    where p_status is null
      or (p_status = 'unknown' and (status is null or status = 'unknown'))
      or status::text = p_status
  )
  select
    filtered.bookmark_id,
    filtered.title,
    filtered.url,
    filtered.domain,
    filtered.created_at,
    coalesce(filtered.status, 'unknown'::public.link_check_status),
    filtered.http_status,
    filtered.redirect_url,
    filtered.checked_at,
    filtered.response_time,
    filtered.error,
    count(*) over ()::bigint
  from filtered
  order by filtered.checked_at asc nulls first, filtered.created_at desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
$$;

revoke all on function public.get_user_library_health_bookmarks(text, integer, integer)
  from public, anon;
grant execute on function public.get_user_library_health_bookmarks(text, integer, integer)
  to authenticated;
