create type public.ai_usage_action_type as enum (
  'bookmark_analysis',
  'bookmark_summary',
  'bookmark_tagging',
  'semantic_search',
  'ai_search',
  'research_analysis',
  'content_extraction',
  'embedding'
);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  action_type public.ai_usage_action_type not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  credits_used numeric(12, 4) not null default 0
    check (credits_used >= 0),
  request_id text,
  created_at timestamptz not null default now()
);

create index ai_usage_user_created_at_idx
  on public.ai_usage (user_id, created_at desc);

create index ai_usage_action_type_created_at_idx
  on public.ai_usage (action_type, created_at desc);

create index ai_usage_request_id_idx
  on public.ai_usage (provider, request_id)
  where request_id is not null;

alter table public.ai_usage enable row level security;

revoke all on public.ai_usage from public, anon, authenticated;
grant select on public.ai_usage to authenticated;
grant insert on public.ai_usage to service_role;

create policy "Users can read their own AI usage"
  on public.ai_usage
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
