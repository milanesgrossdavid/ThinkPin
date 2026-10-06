revoke all on table
  public.profiles,
  public.bookmarks,
  public.collections,
  public.bookmark_collections,
  public.tags,
  public.bookmark_tags,
  public.notes,
  public.bookmark_activity,
  public.highlights,
  public.content_documents,
  public.content_chunks,
  public.research_projects,
  public.research_sources,
  public.research_notes,
  public.reminders,
  public.link_checks,
  public.web_snapshots,
  public.ai_usage,
  public.subscriptions
from public;

grant select, insert on table public.link_checks to service_role;
grant select, insert on table public.web_snapshots to service_role;
