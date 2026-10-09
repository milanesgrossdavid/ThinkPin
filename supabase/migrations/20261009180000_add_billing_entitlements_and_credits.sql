alter type public.ai_usage_action_type add value if not exists 'learning_path';
alter type public.ai_usage_action_type add value if not exists 'learning_explanation';
alter type public.ai_usage_action_type add value if not exists 'report_generation';

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  stripe_created_at bigint not null,
  processed_at timestamptz not null default now()
);

revoke all on public.billing_events from public, anon, authenticated;
grant select, insert on public.billing_events to service_role;

create or replace function public.sync_subscription_from_stripe_event(
  p_stripe_event_id text,
  p_event_type text,
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_plan public.subscription_plan,
  p_status public.subscription_status,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_stripe_event_created_at bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  insert into public.billing_events (
    stripe_event_id,
    event_type,
    stripe_created_at
  )
  values (
    p_stripe_event_id,
    p_event_type,
    p_stripe_event_created_at
  )
  on conflict (stripe_event_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

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

  return true;
end;
$$;

revoke execute on function public.sync_subscription_from_stripe_event(
  text, text, uuid, text, text, public.subscription_plan,
  public.subscription_status, timestamptz, timestamptz, bigint
) from public, anon, authenticated;
grant execute on function public.sync_subscription_from_stripe_event(
  text, text, uuid, text, text, public.subscription_plan,
  public.subscription_status, timestamptz, timestamptz, bigint
) to service_role;

create table public.credit_accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  monthly_limit integer not null check (monthly_limit >= 0),
  credits_reserved integer not null default 0 check (credits_reserved >= 0),
  credits_used integer not null default 0 check (credits_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start),
  constraint credit_period_is_ordered check (period_end > period_start)
);

create table public.credit_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  action text not null check (
    action in (
      'bookmark_tagging',
      'bookmark_summary',
      'semantic_search',
      'ai_search',
      'research_analysis',
      'report_generation',
      'learning_path',
      'learning_explanation'
    )
  ),
  period_start timestamptz not null,
  credits_reserved integer not null check (credits_reserved > 0),
  credits_used integer check (credits_used is null or credits_used >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'settled', 'released')),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_id),
  foreign key (user_id, period_start)
    references public.credit_accounts(user_id, period_start)
    on delete cascade
);

create index credit_reservations_pending_idx
  on public.credit_reservations (created_at)
  where status = 'pending';

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reservation_id uuid references public.credit_reservations(id) on delete set null,
  entry_type text not null check (
    entry_type in ('grant', 'reserve', 'consume', 'release', 'adjustment')
  ),
  amount integer not null check (amount >= 0),
  description text not null,
  created_at timestamptz not null default now(),
  unique (reservation_id, entry_type)
);

create index credit_ledger_user_created_at_idx
  on public.credit_ledger (user_id, created_at desc);

alter table public.credit_accounts enable row level security;
alter table public.credit_reservations enable row level security;
alter table public.credit_ledger enable row level security;

revoke all on public.credit_accounts, public.credit_reservations,
  public.credit_ledger from public, anon, authenticated;
grant select on public.credit_accounts, public.credit_ledger to authenticated;
grant select, insert, update on public.credit_accounts,
  public.credit_reservations, public.credit_ledger to service_role;

create policy "Users can read their own credit accounts"
  on public.credit_accounts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own credit ledger"
  on public.credit_ledger
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.reserve_ai_credits(
  p_user_id uuid,
  p_request_id uuid,
  p_action text,
  p_credits integer,
  p_monthly_limit integer,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.credit_reservations%rowtype;
  v_account public.credit_accounts%rowtype;
begin
  if p_credits <= 0 or p_monthly_limit < 0 or p_period_end <= p_period_start then
    raise exception 'Invalid AI credit reservation.';
  end if;

  select * into v_reservation
  from public.credit_reservations
  where user_id = p_user_id and request_id = p_request_id
  for update;

  if found then
    if v_reservation.action <> p_action then
      raise exception 'Idempotency key was already used for another action.';
    end if;
    return jsonb_build_object(
      'status', v_reservation.status,
      'result', v_reservation.result
    );
  end if;

  insert into public.credit_accounts (
    user_id,
    period_start,
    period_end,
    monthly_limit
  )
  values (p_user_id, p_period_start, p_period_end, p_monthly_limit)
  on conflict (user_id, period_start) do update
  set
    period_end = excluded.period_end,
    monthly_limit = excluded.monthly_limit,
    updated_at = now();

  select * into v_account
  from public.credit_accounts
  where user_id = p_user_id and period_start = p_period_start
  for update;

  if v_account.monthly_limit - v_account.credits_used - v_account.credits_reserved < p_credits then
    raise exception 'AI credit limit reached.';
  end if;

  insert into public.credit_reservations (
    user_id,
    request_id,
    action,
    period_start,
    credits_reserved
  )
  values (p_user_id, p_request_id, p_action, p_period_start, p_credits)
  returning * into v_reservation;

  update public.credit_accounts
  set credits_reserved = credits_reserved + p_credits,
      updated_at = now()
  where user_id = p_user_id and period_start = p_period_start;

  insert into public.credit_ledger (
    user_id, reservation_id, entry_type, amount, description
  )
  values (p_user_id, v_reservation.id, 'reserve', p_credits, p_action);

  return jsonb_build_object('status', 'created', 'result', null);
end;
$$;

create or replace function public.settle_ai_credits(
  p_user_id uuid,
  p_request_id uuid,
  p_actual_credits integer default null,
  p_result jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.credit_reservations%rowtype;
  v_actual integer;
  v_released integer;
begin
  select * into v_reservation
  from public.credit_reservations
  where user_id = p_user_id and request_id = p_request_id
  for update;

  if not found then
    raise exception 'Credit reservation not found.';
  end if;
  if v_reservation.status = 'settled' then
    return;
  end if;
  if v_reservation.status <> 'pending' then
    raise exception 'Credit reservation is no longer pending.';
  end if;

  v_actual := coalesce(p_actual_credits, v_reservation.credits_reserved);
  if v_actual < 0 or v_actual > v_reservation.credits_reserved then
    raise exception 'Settled credits exceed the reservation.';
  end if;
  v_released := v_reservation.credits_reserved - v_actual;

  update public.credit_accounts
  set credits_reserved = credits_reserved - v_reservation.credits_reserved,
      credits_used = credits_used + v_actual,
      updated_at = now()
  where user_id = p_user_id and period_start = v_reservation.period_start;

  update public.credit_reservations
  set status = 'settled',
      credits_used = v_actual,
      result = p_result,
      updated_at = now()
  where id = v_reservation.id;

  insert into public.credit_ledger (
    user_id, reservation_id, entry_type, amount, description
  )
  values (p_user_id, v_reservation.id, 'consume', v_actual, v_reservation.action);

  if v_released > 0 then
    insert into public.credit_ledger (
      user_id, reservation_id, entry_type, amount, description
    )
    values (p_user_id, v_reservation.id, 'release', v_released, v_reservation.action);
  end if;
end;
$$;

create or replace function public.release_ai_credits(
  p_user_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.credit_reservations%rowtype;
begin
  select * into v_reservation
  from public.credit_reservations
  where user_id = p_user_id and request_id = p_request_id
  for update;

  if not found or v_reservation.status <> 'pending' then
    return;
  end if;

  update public.credit_accounts
  set credits_reserved = credits_reserved - v_reservation.credits_reserved,
      updated_at = now()
  where user_id = p_user_id and period_start = v_reservation.period_start;

  update public.credit_reservations
  set status = 'released', updated_at = now()
  where id = v_reservation.id;

  insert into public.credit_ledger (
    user_id, reservation_id, entry_type, amount, description
  )
  values (
    p_user_id,
    v_reservation.id,
    'release',
    v_reservation.credits_reserved,
    v_reservation.action
  );
end;
$$;

revoke execute on function public.reserve_ai_credits(
  uuid, uuid, text, integer, integer, timestamptz, timestamptz
) from public, anon, authenticated;
revoke execute on function public.settle_ai_credits(
  uuid, uuid, integer, jsonb
) from public, anon, authenticated;
revoke execute on function public.release_ai_credits(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_credits(
  uuid, uuid, text, integer, integer, timestamptz, timestamptz
) to service_role;
grant execute on function public.settle_ai_credits(
  uuid, uuid, integer, jsonb
) to service_role;
grant execute on function public.release_ai_credits(uuid, uuid)
  to service_role;
