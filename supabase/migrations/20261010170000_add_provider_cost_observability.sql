alter type public.ai_usage_action_type
  add value if not exists 'global_search';

alter table public.ai_usage
  add column if not exists provider_credits integer
    check (provider_credits is null or provider_credits >= 0),
  add column if not exists estimated_cost_usd numeric(12, 6)
    check (estimated_cost_usd is null or estimated_cost_usd >= 0);

create index if not exists ai_usage_created_at_provider_idx
  on public.ai_usage (created_at, provider);

create or replace function public.provider_usage_summary(
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns table (
  provider text,
  action_type text,
  request_count bigint,
  input_tokens bigint,
  output_tokens bigint,
  provider_credits bigint,
  priced_request_count bigint,
  estimated_cost_usd numeric
)
language sql
security definer
set search_path = ''
as $$
  select
    usage.provider,
    usage.action_type::text,
    count(*)::bigint,
    coalesce(sum(usage.input_tokens), 0)::bigint,
    coalesce(sum(usage.output_tokens), 0)::bigint,
    coalesce(sum(usage.provider_credits), 0)::bigint,
    count(*) filter (where usage.estimated_cost_usd is not null)::bigint,
    sum(usage.estimated_cost_usd)
  from public.ai_usage as usage
  where usage.created_at >= p_period_start
    and usage.created_at < p_period_end
  group by usage.provider, usage.action_type
  order by usage.provider, usage.action_type;
$$;

revoke all on function public.provider_usage_summary(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.provider_usage_summary(timestamptz, timestamptz)
  to service_role;
