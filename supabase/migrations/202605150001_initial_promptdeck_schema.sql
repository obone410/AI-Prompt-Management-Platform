create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  color text not null default '#0f766e',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.prompt_categories(id) on delete set null,
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '',
  content text not null check (char_length(content) between 10 and 12000),
  model text not null default 'gpt-5',
  temperature numeric(3,2) not null default 0.40 check (temperature >= 0 and temperature <= 1.50),
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  is_public boolean not null default false,
  share_slug text,
  usage_count integer not null default 0 check (usage_count >= 0),
  last_tested_at timestamptz,
  search_document tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  input text not null default '',
  output text not null default '',
  model text not null default 'gpt-5',
  provider text not null default 'openai',
  latency_ms integer not null default 0 check (latency_ms >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_prompt_categories_updated_at on public.prompt_categories;
create trigger set_prompt_categories_updated_at
before update on public.prompt_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_prompts_updated_at on public.prompts;
create trigger set_prompts_updated_at
before update on public.prompts
for each row execute function public.set_updated_at();

drop trigger if exists create_profile_on_signup on auth.users;
create trigger create_profile_on_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create unique index if not exists prompt_categories_user_name_idx
  on public.prompt_categories (user_id, lower(name));

create index if not exists prompt_categories_user_idx
  on public.prompt_categories (user_id, created_at desc);

create index if not exists prompts_user_updated_idx
  on public.prompts (user_id, updated_at desc);

create index if not exists prompts_user_category_idx
  on public.prompts (user_id, category_id, updated_at desc);

create index if not exists prompts_user_favorite_idx
  on public.prompts (user_id, updated_at desc)
  where is_favorite = true;

create unique index if not exists prompts_public_share_slug_idx
  on public.prompts (share_slug)
  where is_public = true and share_slug is not null;

create index if not exists prompts_tags_idx
  on public.prompts using gin (tags);

create index if not exists prompts_search_document_idx
  on public.prompts using gin (search_document);

create index if not exists prompt_runs_prompt_created_idx
  on public.prompt_runs (prompt_id, created_at desc);

create index if not exists prompt_runs_user_created_idx
  on public.prompt_runs (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.prompt_categories enable row level security;
alter table public.prompts enable row level security;
alter table public.prompt_runs enable row level security;

create policy "profiles are readable by owner"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles are updatable by owner"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "categories are readable by owner"
on public.prompt_categories for select
using (auth.uid() = user_id);

create policy "categories are insertable by owner"
on public.prompt_categories for insert
with check (auth.uid() = user_id);

create policy "categories are updatable by owner"
on public.prompt_categories for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "categories are deletable by owner"
on public.prompt_categories for delete
using (auth.uid() = user_id);

create policy "prompts are readable by owner or public slug"
on public.prompts for select
using (auth.uid() = user_id or is_public = true);

create policy "prompts are insertable by owner"
on public.prompts for insert
with check (
  auth.uid() = user_id
  and (
    category_id is null
    or exists (
      select 1
      from public.prompt_categories category
      where category.id = category_id
        and category.user_id = auth.uid()
    )
  )
);

create policy "prompts are updatable by owner"
on public.prompts for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    category_id is null
    or exists (
      select 1
      from public.prompt_categories category
      where category.id = category_id
        and category.user_id = auth.uid()
    )
  )
);

create policy "prompts are deletable by owner"
on public.prompts for delete
using (auth.uid() = user_id);

create policy "prompt runs are readable by owner"
on public.prompt_runs for select
using (auth.uid() = user_id);

create policy "prompt runs are insertable by owner"
on public.prompt_runs for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.prompts prompt
    where prompt.id = prompt_id
      and prompt.user_id = auth.uid()
  )
);

create policy "prompt runs are deletable by owner"
on public.prompt_runs for delete
using (auth.uid() = user_id);
