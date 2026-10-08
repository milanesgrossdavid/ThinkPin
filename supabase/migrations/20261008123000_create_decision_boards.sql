create table public.decision_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  question text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decision_boards_id_user_id_unique unique (id, user_id)
);

create index decision_boards_user_updated_at_idx
  on public.decision_boards (user_id, updated_at desc);

create table public.decision_options (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null
    references public.decision_boards (id)
    on delete cascade,
  label text not null,
  position integer not null default 0,
  constraint decision_options_board_label_unique unique (board_id, label),
  constraint decision_options_id_board_id_unique unique (id, board_id)
);

create table public.decision_criteria (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null
    references public.decision_boards (id)
    on delete cascade,
  label text not null,
  position integer not null default 0,
  constraint decision_criteria_board_label_unique unique (board_id, label),
  constraint decision_criteria_id_board_id_unique unique (id, board_id)
);

create table public.decision_evidence (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null
    references public.decision_boards (id)
    on delete cascade,
  option_id uuid not null,
  criterion_id uuid not null,
  bookmark_id uuid references public.bookmarks (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  constraint decision_evidence_option_board_fk
    foreign key (option_id, board_id)
    references public.decision_options (id, board_id)
    on delete cascade,
  constraint decision_evidence_criterion_board_fk
    foreign key (criterion_id, board_id)
    references public.decision_criteria (id, board_id)
    on delete cascade,
  constraint decision_evidence_bookmark_or_note_check
    check (bookmark_id is not null or nullif(trim(note), '') is not null)
);

create index decision_options_board_position_idx
  on public.decision_options (board_id, position);
create index decision_criteria_board_position_idx
  on public.decision_criteria (board_id, position);
create index decision_evidence_board_option_criterion_idx
  on public.decision_evidence (board_id, option_id, criterion_id);
create index decision_evidence_bookmark_id_idx
  on public.decision_evidence (bookmark_id);

alter table public.decision_boards enable row level security;
alter table public.decision_options enable row level security;
alter table public.decision_criteria enable row level security;
alter table public.decision_evidence enable row level security;

revoke all on public.decision_boards from public, anon, authenticated;
revoke all on public.decision_options from public, anon, authenticated;
revoke all on public.decision_criteria from public, anon, authenticated;
revoke all on public.decision_evidence from public, anon, authenticated;

grant select, insert, update, delete
  on public.decision_boards to authenticated;
grant select, insert, update, delete
  on public.decision_options to authenticated;
grant select, insert, update, delete
  on public.decision_criteria to authenticated;
grant select, insert, update, delete
  on public.decision_evidence to authenticated;

create policy "Users can manage their own decision boards"
  on public.decision_boards
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage options in their own decision boards"
  on public.decision_options
  for all
  to authenticated
  using (
    exists (
      select 1 from public.decision_boards as board
      where board.id = decision_options.board_id
        and board.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.decision_boards as board
      where board.id = decision_options.board_id
        and board.user_id = (select auth.uid())
    )
  );

create policy "Users can manage criteria in their own decision boards"
  on public.decision_criteria
  for all
  to authenticated
  using (
    exists (
      select 1 from public.decision_boards as board
      where board.id = decision_criteria.board_id
        and board.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.decision_boards as board
      where board.id = decision_criteria.board_id
        and board.user_id = (select auth.uid())
    )
  );

create policy "Users can manage evidence in their own decision boards"
  on public.decision_evidence
  for all
  to authenticated
  using (
    exists (
      select 1 from public.decision_boards as board
      where board.id = decision_evidence.board_id
        and board.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.decision_boards as board
      join public.bookmarks as bookmark
        on bookmark.id = decision_evidence.bookmark_id
      where board.id = decision_evidence.board_id
        and board.user_id = (select auth.uid())
        and bookmark.user_id = (select auth.uid())
    )
    or (
      decision_evidence.bookmark_id is null
      and exists (
        select 1 from public.decision_boards as board
        where board.id = decision_evidence.board_id
          and board.user_id = (select auth.uid())
      )
    )
  );

create trigger set_decision_boards_updated_at
  before update on public.decision_boards
  for each row
  execute function public.set_updated_at();
