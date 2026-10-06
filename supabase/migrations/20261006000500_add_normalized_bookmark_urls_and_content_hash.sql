alter table public.bookmarks
  add column if not exists normalized_url text;

update public.bookmarks
set normalized_url = coalesce(canonical_url, url)
where normalized_url is null;

alter table public.bookmarks
  alter column normalized_url set not null;

create unique index if not exists bookmarks_user_normalized_url_unique
  on public.bookmarks (user_id, normalized_url);

alter table public.content_documents
  add column if not exists content_hash text;

create index if not exists content_documents_content_hash_idx
  on public.content_documents (content_hash)
  where content_hash is not null;
