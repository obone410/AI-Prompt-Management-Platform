drop policy if exists "prompts are readable by owner or public slug" on public.prompts;

create policy "prompts are readable by owner"
on public.prompts for select
using (auth.uid() = user_id);

create or replace function public.get_public_prompt_by_slug(lookup_slug text)
returns table (
  id uuid,
  title text,
  description text,
  content text,
  tags text[],
  model text,
  temperature numeric,
  share_slug text,
  category_name text,
  category_color text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    prompt.id,
    prompt.title,
    prompt.description,
    prompt.content,
    prompt.tags,
    prompt.model,
    prompt.temperature,
    prompt.share_slug,
    category.name as category_name,
    category.color as category_color,
    prompt.updated_at
  from public.prompts prompt
  left join public.prompt_categories category
    on category.id = prompt.category_id
  where prompt.is_public = true
    and prompt.share_slug = lookup_slug
  limit 1;
$$;

revoke all on function public.get_public_prompt_by_slug(text) from public;
grant execute on function public.get_public_prompt_by_slug(text) to anon, authenticated;
