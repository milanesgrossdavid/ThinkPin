create type public.subscription_plan as enum (
  'free',
  'pro',
  'power',
  'team'
);

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused'
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan public.subscription_plan not null default 'free',
  status public.subscription_status,
  current_period_start timestamptz,
  current_period_end timestamptz,
  stripe_event_created_at bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_period_is_ordered check (
    current_period_start is null
    or current_period_end is null
    or current_period_end >= current_period_start
  ),
  constraint free_plan_has_no_active_status check (
    plan <> 'free' or status is null or status = 'canceled'
  )
);

create index subscriptions_status_period_end_idx
  on public.subscriptions (status, current_period_end);

alter table public.subscriptions enable row level security;

revoke all on public.subscriptions from public, anon, authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert, update on public.subscriptions to service_role;

create policy "Users can read their own subscription"
  on public.subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

create or replace function public.sync_subscription_from_stripe(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_plan public.subscription_plan,
  p_status public.subscription_status,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_stripe_event_created_at bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions as current_subscription (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    plan,
    status,
    current_period_start,
    current_period_end,
    stripe_event_created_at
  )
  values (
    p_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_plan,
    p_status,
    p_current_period_start,
    p_current_period_end,
    p_stripe_event_created_at
  )
  on conflict (user_id) do update
  set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    plan = excluded.plan,
    status = excluded.status,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    stripe_event_created_at = excluded.stripe_event_created_at
  where current_subscription.stripe_event_created_at is null
    or current_subscription.stripe_event_created_at
      <= excluded.stripe_event_created_at;
end;
$$;

revoke execute on function public.sync_subscription_from_stripe(
  uuid, text, text, public.subscription_plan, public.subscription_status,
  timestamptz, timestamptz, bigint
) from public, anon, authenticated;

grant execute on function public.sync_subscription_from_stripe(
  uuid, text, text, public.subscription_plan, public.subscription_status,
  timestamptz, timestamptz, bigint
) to service_role;
