create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null check (char_length(slug) between 2 and 80),
  billing_plan text not null default 'starter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.prompt_categories
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

alter table public.prompts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

create table if not exists public.prompt_collections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '',
  visibility text not null default 'private' check (visibility in ('private', 'workspace', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_prompts (
  collection_id uuid not null references public.prompt_collections(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, prompt_id)
);

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  version_number integer not null check (version_number > 0),
  title text not null,
  description text not null default '',
  content text not null,
  tags text[] not null default '{}',
  model text not null default 'gpt-5',
  temperature numeric(3,2) not null default 0.40,
  notes text not null default 'Automatic snapshot before edit.',
  created_at timestamptz not null default now(),
  unique (prompt_id, version_number)
);

create table if not exists public.prompt_evaluations (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references public.prompts(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  provider text not null check (provider in ('openai', 'anthropic', 'google', 'demo')),
  model text not null,
  input text not null default '',
  output text not null default '',
  latency_ms integer not null default 0 check (latency_ms >= 0),
  token_estimate integer not null default 0 check (token_estimate >= 0),
  output_length integer not null default 0 check (output_length >= 0),
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  status text not null default 'completed' check (status in ('queued', 'running', 'completed', 'failed')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now()
);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces workspace
    where workspace.id = target_workspace_id
      and workspace.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = auth.uid()
      and member.status = 'active'
  );
$$;

create or replace function public.next_prompt_version_number(target_prompt_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(version_number), 0) + 1
  from public.prompt_versions
  where prompt_id = target_prompt_id;
$$;

create or replace function public.capture_prompt_version_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.title is distinct from new.title
    or old.description is distinct from new.description
    or old.content is distinct from new.content
    or old.tags is distinct from new.tags
    or old.model is distinct from new.model
    or old.temperature is distinct from new.temperature
  ) then
    insert into public.prompt_versions (
      prompt_id,
      user_id,
      workspace_id,
      version_number,
      title,
      description,
      content,
      tags,
      model,
      temperature
    )
    values (
      old.id,
      old.user_id,
      old.workspace_id,
      public.next_prompt_version_number(old.id),
      old.title,
      old.description,
      old.content,
      old.tags,
      old.model,
      old.temperature
    );
  end if;

  return new;
end;
$$;

drop trigger if exists capture_prompt_version_before_update on public.prompts;
create trigger capture_prompt_version_before_update
before update on public.prompts
for each row execute function public.capture_prompt_version_before_update();

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists set_prompt_collections_updated_at on public.prompt_collections;
create trigger set_prompt_collections_updated_at
before update on public.prompt_collections
for each row execute function public.set_updated_at();

create index if not exists workspaces_owner_idx on public.workspaces (owner_id, created_at desc);
create unique index if not exists workspaces_owner_slug_idx on public.workspaces (owner_id, lower(slug));
create index if not exists workspace_members_user_idx on public.workspace_members (user_id, workspace_id);
create index if not exists prompt_categories_workspace_idx on public.prompt_categories (workspace_id, created_at desc);
create index if not exists prompts_workspace_updated_idx on public.prompts (workspace_id, updated_at desc);
create index if not exists prompt_collections_workspace_idx on public.prompt_collections (workspace_id, updated_at desc);
create index if not exists prompt_versions_prompt_idx on public.prompt_versions (prompt_id, version_number desc);
create index if not exists prompt_evaluations_prompt_idx on public.prompt_evaluations (prompt_id, created_at desc);
create index if not exists prompt_evaluations_user_idx on public.prompt_evaluations (user_id, created_at desc);
create index if not exists prompt_activity_workspace_idx on public.prompt_activity (workspace_id, created_at desc);
create index if not exists workspace_invites_workspace_idx on public.workspace_invites (workspace_id, created_at desc);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.prompt_collections enable row level security;
alter table public.collection_prompts enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.prompt_evaluations enable row level security;
alter table public.prompt_activity enable row level security;
alter table public.workspace_invites enable row level security;

create policy "workspaces are readable by members"
on public.workspaces for select
using (owner_id = auth.uid() or public.is_workspace_member(id));

create policy "workspaces are insertable by owner"
on public.workspaces for insert
with check (owner_id = auth.uid());

create policy "workspaces are updatable by owner"
on public.workspaces for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "workspace members are readable by members"
on public.workspace_members for select
using (public.is_workspace_member(workspace_id));

create policy "workspace members are manageable by owner"
on public.workspace_members for all
using (
  exists (
    select 1 from public.workspaces workspace
    where workspace.id = workspace_id
      and workspace.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces workspace
    where workspace.id = workspace_id
      and workspace.owner_id = auth.uid()
  )
);

create policy "collections are readable by owner or workspace"
on public.prompt_collections for select
using (
  owner_id = auth.uid()
  or visibility = 'public'
  or (visibility = 'workspace' and public.is_workspace_member(workspace_id))
);

create policy "collections are writable by owner"
on public.prompt_collections for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "collection prompts are readable through collection"
on public.collection_prompts for select
using (
  exists (
    select 1 from public.prompt_collections collection
    where collection.id = collection_id
      and (
        collection.owner_id = auth.uid()
        or collection.visibility = 'public'
        or (collection.visibility = 'workspace' and public.is_workspace_member(collection.workspace_id))
      )
  )
);

create policy "collection prompts are writable by collection owner"
on public.collection_prompts for all
using (
  exists (
    select 1 from public.prompt_collections collection
    where collection.id = collection_id
      and collection.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.prompt_collections collection
    where collection.id = collection_id
      and collection.owner_id = auth.uid()
  )
);

create policy "prompt versions are readable by owner or workspace"
on public.prompt_versions for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "prompt versions are insertable by owner"
on public.prompt_versions for insert
with check (user_id = auth.uid());

create policy "prompt evaluations are readable by owner or workspace"
on public.prompt_evaluations for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "prompt evaluations are insertable by owner"
on public.prompt_evaluations for insert
with check (user_id = auth.uid());

create policy "prompt activity is readable by owner or workspace"
on public.prompt_activity for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "prompt activity is insertable by owner"
on public.prompt_activity for insert
with check (user_id = auth.uid());

create policy "workspace invites are readable by workspace members"
on public.workspace_invites for select
using (public.is_workspace_member(workspace_id));

create policy "workspace invites are manageable by workspace owner"
on public.workspace_invites for all
using (
  exists (
    select 1 from public.workspaces workspace
    where workspace.id = workspace_id
      and workspace.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces workspace
    where workspace.id = workspace_id
      and workspace.owner_id = auth.uid()
  )
);
