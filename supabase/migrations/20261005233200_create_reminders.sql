create type public.reminder_type as enum (
  'manual',
  'smart',
  'research',
  'learning',
  'shopping'
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bookmark_id uuid not null,
  type public.reminder_type not null default 'manual',
  scheduled_for timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_bookmark_owner_fkey
    foreign key (bookmark_id, user_id)
    references public.bookmarks (id, user_id)
    on delete cascade
);

create index reminders_user_scheduled_idx
  on public.reminders (user_id, scheduled_for);

create index reminders_bookmark_id_idx
  on public.reminders (bookmark_id);

create index reminders_user_pending_scheduled_idx
  on public.reminders (user_id, scheduled_for)
  where completed_at is null;

alter table public.reminders enable row level security;

revoke all on public.reminders from public, anon, authenticated;
grant select, insert, update, delete on public.reminders to authenticated;

create policy "Users can manage their own reminders"
  on public.reminders
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger set_reminders_updated_at
  before update on public.reminders
  for each row
  execute function public.set_updated_at();
