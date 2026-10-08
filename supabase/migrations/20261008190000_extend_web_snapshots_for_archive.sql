alter table public.web_snapshots
  add column page_url text,
  add column page_title text,
  add column page_description text,
  add column word_count integer
    check (word_count is null or word_count >= 0);

comment on table public.web_snapshots is
  'Version history for manually archived web pages. HTML files live in private Supabase Storage; readable text and metadata are stored here.';
