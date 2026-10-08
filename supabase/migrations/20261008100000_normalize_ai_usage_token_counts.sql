create or replace function public.normalize_ai_usage_token_counts()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.input_tokens := coalesce(new.input_tokens, 0);
  new.output_tokens := coalesce(new.output_tokens, 0);
  return new;
end;
$$;

create trigger normalize_ai_usage_token_counts
  before insert or update on public.ai_usage
  for each row
  execute function public.normalize_ai_usage_token_counts();
