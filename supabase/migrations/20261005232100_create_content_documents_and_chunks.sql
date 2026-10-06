create table public.content_documents (
  id uuid primary key default gen_random_uuid(),
  bookmark_id uuid not null unique,
  content text not null,
  content_hash text,
  mime_type text,
  language text,
  word_count integer
    check (word_count is null or word_count >= 0),
  reading_time_minutes integer
    check (reading_time_minutes is null or reading_time_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_documents_bookmark_owner_fkey
    foreign key (bookmark_id)
    references public.bookmarks (id)
    on delete cascade
);

create table public.content_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null
    references public.content_documents (id)
    on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  token_count integer check (token_count is null or token_count >= 0),
  created_at timestamptz not null default now(),
  constraint content_chunks_document_position_unique
    unique (document_id, chunk_index)
);

create index content_chunks_document_id_idx
  on public.content_chunks (document_id);

create index content_documents_content_hash_idx
  on public.content_documents (content_hash)
  where content_hash is not null;

alter table public.content_documents enable row level security;
alter table public.content_chunks enable row level security;

revoke all on public.content_documents from public, anon, authenticated;
revoke all on public.content_chunks from public, anon, authenticated;
grant select, insert, update, delete on public.content_documents to authenticated;
grant select, insert, update, delete on public.content_chunks to authenticated;

create policy "Users can manage content documents for their bookmarks"
  on public.content_documents
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.bookmarks as bookmark
      where bookmark.id = bookmark_id
        and bookmark.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.bookmarks as bookmark
      where bookmark.id = bookmark_id
        and bookmark.user_id = (select auth.uid())
    )
  );

create policy "Users can manage chunks for their bookmark documents"
  on public.content_chunks
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.content_documents as document
      join public.bookmarks as bookmark
        on bookmark.id = document.bookmark_id
      where document.id = document_id
        and bookmark.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.content_documents as document
      join public.bookmarks as bookmark
        on bookmark.id = document.bookmark_id
      where document.id = document_id
        and bookmark.user_id = (select auth.uid())
    )
  );

create trigger set_content_documents_updated_at
  before update on public.content_documents
  for each row
  execute function public.set_updated_at();
