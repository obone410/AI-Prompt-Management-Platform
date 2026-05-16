create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  plan text not null default 'team',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations organization
    where organization.id = target_organization_id
      and organization.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = auth.uid()
      and member.status = 'active'
  );
$$;

create or replace function public.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations organization
    where organization.id = target_organization_id
      and organization.owner_id = auth.uid()
  );
$$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '',
  prompt_ids uuid[] not null default '{}',
  models text[] not null default '{}',
  datasets jsonb not null default '[]',
  evaluation_metrics text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'running', 'completed', 'archived')),
  aggregate_metrics jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experiment_runs (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  provider text not null default 'openai' check (provider in ('openai', 'anthropic', 'google', 'demo')),
  dataset_name text not null default '',
  input text not null default '',
  output text not null default '',
  clarity integer not null default 0 check (clarity between 0 and 100),
  correctness integer not null default 0 check (correctness between 0 and 100),
  hallucination_likelihood integer not null default 0 check (hallucination_likelihood between 0 and 100),
  consistency integer not null default 0 check (consistency between 0 and 100),
  tone_alignment integer not null default 0 check (tone_alignment between 0 and 100),
  formatting_quality integer not null default 0 check (formatting_quality between 0 and 100),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  input_token_estimate integer not null default 0 check (input_token_estimate >= 0),
  output_token_estimate integer not null default 0 check (output_token_estimate >= 0),
  token_estimate integer not null default 0 check (token_estimate >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  status text not null default 'completed' check (status in ('queued', 'running', 'completed', 'failed')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.evaluation_datasets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '',
  examples jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evaluation_presets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  metrics text[] not null default '{}',
  rubric text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_deployments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  version_id uuid references public.prompt_versions(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null check (environment in ('development', 'staging', 'production')),
  status text not null default 'active' check (status in ('active', 'promoting', 'rolled_back', 'failed')),
  metadata jsonb not null default '{}',
  deployed_at timestamptz not null default now()
);

create table if not exists public.deployment_history (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references public.prompt_deployments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('deployed', 'promoted', 'rolled_back', 'failed')),
  summary text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '',
  variables text[] not null default '{}',
  nodes jsonb not null default '[]',
  edges jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.ai_workflows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  token_estimate integer not null default 0 check (token_estimate >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  logs jsonb not null default '[]',
  created_at timestamptz not null default now()
);

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_experiments_updated_at on public.experiments;
create trigger set_experiments_updated_at
before update on public.experiments
for each row execute function public.set_updated_at();

drop trigger if exists set_evaluation_datasets_updated_at on public.evaluation_datasets;
create trigger set_evaluation_datasets_updated_at
before update on public.evaluation_datasets
for each row execute function public.set_updated_at();

drop trigger if exists set_evaluation_presets_updated_at on public.evaluation_presets;
create trigger set_evaluation_presets_updated_at
before update on public.evaluation_presets
for each row execute function public.set_updated_at();

drop trigger if exists set_ai_workflows_updated_at on public.ai_workflows;
create trigger set_ai_workflows_updated_at
before update on public.ai_workflows
for each row execute function public.set_updated_at();

create index if not exists organizations_owner_idx on public.organizations (owner_id, created_at desc);
create index if not exists organization_members_user_idx on public.organization_members (user_id, organization_id);
create index if not exists audit_logs_workspace_idx on public.audit_logs (workspace_id, created_at desc);
create index if not exists experiments_workspace_idx on public.experiments (workspace_id, updated_at desc);
create index if not exists experiments_status_idx on public.experiments (created_by, status, updated_at desc);
create index if not exists experiment_runs_experiment_idx on public.experiment_runs (experiment_id, created_at desc);
create index if not exists experiment_runs_model_idx on public.experiment_runs (user_id, model, created_at desc);
create index if not exists prompt_deployments_env_idx on public.prompt_deployments (workspace_id, environment, deployed_at desc);
create index if not exists deployment_history_deployment_idx on public.deployment_history (deployment_id, created_at desc);
create index if not exists ai_workflows_workspace_idx on public.ai_workflows (workspace_id, updated_at desc);
create index if not exists workflow_runs_workflow_idx on public.workflow_runs (workflow_id, created_at desc);
create index if not exists evaluation_datasets_workspace_idx on public.evaluation_datasets (workspace_id, updated_at desc);
create index if not exists evaluation_presets_workspace_idx on public.evaluation_presets (workspace_id, updated_at desc);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.audit_logs enable row level security;
alter table public.experiments enable row level security;
alter table public.experiment_runs enable row level security;
alter table public.evaluation_datasets enable row level security;
alter table public.evaluation_presets enable row level security;
alter table public.prompt_deployments enable row level security;
alter table public.deployment_history enable row level security;
alter table public.ai_workflows enable row level security;
alter table public.workflow_runs enable row level security;

create policy "organizations are readable by owner or member"
on public.organizations for select
using (owner_id = auth.uid() or public.is_organization_member(id));

create policy "organizations are insertable by owner"
on public.organizations for insert
with check (owner_id = auth.uid());

create policy "organizations are updatable by owner"
on public.organizations for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "organization members are readable by organization members"
on public.organization_members for select
using (public.is_organization_member(organization_id));

create policy "organization members are manageable by owner"
on public.organization_members for all
using (public.is_organization_owner(organization_id))
with check (public.is_organization_owner(organization_id));

create policy "audit logs are readable by workspace members"
on public.audit_logs for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "audit logs are insertable by actor"
on public.audit_logs for insert
with check (user_id = auth.uid());

create policy "experiments are readable by owner or workspace"
on public.experiments for select
using (created_by = auth.uid() or public.is_workspace_member(workspace_id));

create policy "experiments are writable by owner"
on public.experiments for all
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "experiment runs are readable by owner or workspace"
on public.experiment_runs for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.experiments experiment
    where experiment.id = experiment_id
      and public.is_workspace_member(experiment.workspace_id)
  )
);

create policy "experiment runs are insertable by actor"
on public.experiment_runs for insert
with check (user_id = auth.uid());

create policy "evaluation datasets are readable by owner or workspace"
on public.evaluation_datasets for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "evaluation datasets are writable by owner"
on public.evaluation_datasets for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "evaluation presets are readable by owner or workspace"
on public.evaluation_presets for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "evaluation presets are writable by owner"
on public.evaluation_presets for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "prompt deployments are readable by owner or workspace"
on public.prompt_deployments for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "prompt deployments are writable by owner"
on public.prompt_deployments for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "deployment history is readable by deployment access"
on public.deployment_history for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.prompt_deployments deployment
    where deployment.id = deployment_id
      and public.is_workspace_member(deployment.workspace_id)
  )
);

create policy "deployment history is insertable by actor"
on public.deployment_history for insert
with check (user_id = auth.uid());

create policy "ai workflows are readable by owner or workspace"
on public.ai_workflows for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "ai workflows are writable by owner"
on public.ai_workflows for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "workflow runs are readable by workflow access"
on public.workflow_runs for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.ai_workflows workflow
    where workflow.id = workflow_id
      and public.is_workspace_member(workflow.workspace_id)
  )
);

create policy "workflow runs are insertable by actor"
on public.workflow_runs for insert
with check (user_id = auth.uid());
