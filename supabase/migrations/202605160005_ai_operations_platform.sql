create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('prompt', 'evaluation', 'experiment', 'workflow', 'deployment', 'agent', 'benchmark')),
  entity_id text not null,
  trace_id uuid,
  parent_run_id uuid references public.ai_runs(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  model text not null default 'system',
  provider text not null default 'system' check (provider in ('openai', 'anthropic', 'google', 'demo', 'system')),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  input_token_estimate integer not null default 0 check (input_token_estimate >= 0),
  output_token_estimate integer not null default 0 check (output_token_estimate >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  metadata jsonb not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ai_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ai_runs(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('prompt_output', 'workflow_output', 'agent_memory', 'benchmark_report', 'release_note')),
  title text not null check (char_length(title) between 2 and 180),
  content text not null default '',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_metrics (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ai_runs(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('prompt', 'evaluation', 'experiment', 'workflow', 'deployment', 'agent', 'benchmark', 'system')),
  name text not null,
  value numeric(14,6) not null default 0,
  unit text not null check (unit in ('score', 'ms', 'tokens', 'usd', 'percent', 'count')),
  created_at timestamptz not null default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  type text not null check (type in ('research', 'support', 'coding', 'data-extraction', 'evaluation')),
  description text not null default '',
  tools text[] not null default '{}',
  memory_keys text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  run_id uuid references public.ai_runs(id) on delete set null,
  trace_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  objective text not null default '',
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  steps jsonb not null default '[]',
  latency_ms integer not null default 0 check (latency_ms >= 0),
  token_estimate integer not null default 0 check (token_estimate >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text not null default '',
  updated_at timestamptz not null default now(),
  unique (agent_id, key)
);

create table if not exists public.agent_tools (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('search', 'database', 'code', 'ticketing', 'http', 'evaluation')),
  description text not null default '',
  status text not null default 'mock' check (status in ('mock', 'connected')),
  created_at timestamptz not null default now()
);

create table if not exists public.benchmark_suites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '',
  prompt_ids uuid[] not null default '{}',
  model_ids text[] not null default '{}',
  dataset_ids uuid[] not null default '{}',
  metrics text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'running', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.benchmark_datasets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  task_type text not null default 'general',
  examples jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.benchmark_runs (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid not null references public.benchmark_suites(id) on delete cascade,
  run_id uuid references public.ai_runs(id) on delete set null,
  prompt_id uuid references public.prompts(id) on delete set null,
  dataset_id uuid references public.benchmark_datasets(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  accuracy integer not null default 0 check (accuracy between 0 and 100),
  hallucination_rate integer not null default 0 check (hallucination_rate between 0 and 100),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  consistency_score integer not null default 0 check (consistency_score between 0 and 100),
  regression_delta integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.benchmark_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.benchmark_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  value numeric(14,6) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.trace_sessions (
  id uuid primary key default gen_random_uuid(),
  root_run_id uuid references public.ai_runs(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('prompt', 'evaluation', 'experiment', 'workflow', 'deployment', 'agent', 'benchmark')),
  entity_id text not null,
  name text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  total_latency_ms integer not null default 0 check (total_latency_ms >= 0),
  total_cost_usd numeric(12,6) not null default 0 check (total_cost_usd >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.trace_steps (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null references public.trace_sessions(id) on delete cascade,
  parent_step_id uuid references public.trace_steps(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('prompt', 'model', 'tool', 'condition', 'loop', 'parallel', 'artifact', 'release')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  token_estimate integer not null default 0 check (token_estimate >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  depth integer not null default 0 check (depth >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.trace_logs (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null references public.trace_sessions(id) on delete cascade,
  step_id uuid references public.trace_steps(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null default 'info' check (level in ('info', 'warning', 'error')),
  message text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_intelligence (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  health_score integer not null default 0 check (health_score between 0 and 100),
  clarity integer not null default 0 check (clarity between 0 and 100),
  robustness integer not null default 0 check (robustness between 0 and 100),
  hallucination_risk integer not null default 0 check (hallucination_risk between 0 and 100),
  duplicate_risk integer not null default 0 check (duplicate_risk between 0 and 100),
  cluster text not null default '',
  suggestions text[] not null default '{}',
  model_recommendation text not null default 'gpt-5',
  updated_at timestamptz not null default now(),
  unique (prompt_id)
);

create table if not exists public.prompt_releases (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid references public.prompt_deployments(id) on delete cascade,
  version_id uuid references public.prompt_versions(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tag text not null,
  environment text not null check (environment in ('development', 'staging', 'production')),
  status text not null default 'watching' check (status in ('healthy', 'watching', 'degraded', 'rolled_back')),
  rollout_percent integer not null default 0 check (rollout_percent between 0 and 100),
  health_score integer not null default 0 check (health_score between 0 and 100),
  notes text not null default '',
  created_at timestamptz not null default now()
);

drop trigger if exists set_agents_updated_at on public.agents;
create trigger set_agents_updated_at
before update on public.agents
for each row execute function public.set_updated_at();

drop trigger if exists set_benchmark_suites_updated_at on public.benchmark_suites;
create trigger set_benchmark_suites_updated_at
before update on public.benchmark_suites
for each row execute function public.set_updated_at();

drop trigger if exists set_benchmark_datasets_updated_at on public.benchmark_datasets;
create trigger set_benchmark_datasets_updated_at
before update on public.benchmark_datasets
for each row execute function public.set_updated_at();

create index if not exists ai_runs_workspace_started_idx on public.ai_runs (workspace_id, started_at desc);
create index if not exists ai_runs_entity_idx on public.ai_runs (entity_type, entity_id, started_at desc);
create index if not exists ai_runs_parent_idx on public.ai_runs (parent_run_id);
create index if not exists ai_artifacts_workspace_idx on public.ai_artifacts (workspace_id, created_at desc);
create index if not exists ai_metrics_workspace_scope_idx on public.ai_metrics (workspace_id, scope, created_at desc);
create index if not exists agents_workspace_idx on public.agents (workspace_id, updated_at desc);
create index if not exists agent_runs_agent_idx on public.agent_runs (agent_id, created_at desc);
create index if not exists benchmark_runs_suite_idx on public.benchmark_runs (suite_id, created_at desc);
create index if not exists trace_sessions_workspace_idx on public.trace_sessions (workspace_id, started_at desc);
create index if not exists trace_steps_trace_idx on public.trace_steps (trace_id, depth, started_at);
create index if not exists trace_logs_trace_idx on public.trace_logs (trace_id, created_at desc);
create index if not exists prompt_intelligence_workspace_idx on public.prompt_intelligence (workspace_id, health_score desc);
create index if not exists prompt_releases_workspace_idx on public.prompt_releases (workspace_id, environment, created_at desc);

alter table public.ai_runs enable row level security;
alter table public.ai_artifacts enable row level security;
alter table public.ai_metrics enable row level security;
alter table public.agents enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_memory enable row level security;
alter table public.agent_tools enable row level security;
alter table public.benchmark_suites enable row level security;
alter table public.benchmark_datasets enable row level security;
alter table public.benchmark_runs enable row level security;
alter table public.benchmark_scores enable row level security;
alter table public.trace_sessions enable row level security;
alter table public.trace_steps enable row level security;
alter table public.trace_logs enable row level security;
alter table public.prompt_intelligence enable row level security;
alter table public.prompt_releases enable row level security;

create policy "ai runs are readable by actor or workspace"
on public.ai_runs for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "ai runs are insertable by actor"
on public.ai_runs for insert
with check (user_id = auth.uid());

create policy "ai runs are updatable by actor"
on public.ai_runs for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "ai artifacts are readable by actor or workspace"
on public.ai_artifacts for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "ai artifacts are insertable by actor"
on public.ai_artifacts for insert
with check (user_id = auth.uid());

create policy "ai metrics are readable by actor or workspace"
on public.ai_metrics for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "ai metrics are insertable by actor"
on public.ai_metrics for insert
with check (user_id = auth.uid());

create policy "agents are readable by actor or workspace"
on public.agents for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "agents are writable by actor"
on public.agents for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "agent runs are readable through agent access"
on public.agent_runs for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.agents agent
    where agent.id = agent_id
      and public.is_workspace_member(agent.workspace_id)
  )
);

create policy "agent runs are insertable by actor"
on public.agent_runs for insert
with check (user_id = auth.uid());

create policy "agent memory is readable through agent access"
on public.agent_memory for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.agents agent
    where agent.id = agent_id
      and public.is_workspace_member(agent.workspace_id)
  )
);

create policy "agent memory is writable by actor"
on public.agent_memory for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "agent tools are readable by actor or workspace"
on public.agent_tools for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "agent tools are writable by actor"
on public.agent_tools for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "benchmark suites are readable by actor or workspace"
on public.benchmark_suites for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "benchmark suites are writable by actor"
on public.benchmark_suites for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "benchmark datasets are readable by actor or workspace"
on public.benchmark_datasets for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "benchmark datasets are writable by actor"
on public.benchmark_datasets for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "benchmark runs are readable through suite access"
on public.benchmark_runs for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.benchmark_suites suite
    where suite.id = suite_id
      and public.is_workspace_member(suite.workspace_id)
  )
);

create policy "benchmark runs are insertable by actor"
on public.benchmark_runs for insert
with check (user_id = auth.uid());

create policy "benchmark scores are readable through run access"
on public.benchmark_scores for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.benchmark_runs run
    join public.benchmark_suites suite on suite.id = run.suite_id
    where run.id = run_id
      and public.is_workspace_member(suite.workspace_id)
  )
);

create policy "benchmark scores are insertable by actor"
on public.benchmark_scores for insert
with check (user_id = auth.uid());

create policy "trace sessions are readable by actor or workspace"
on public.trace_sessions for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "trace sessions are insertable by actor"
on public.trace_sessions for insert
with check (user_id = auth.uid());

create policy "trace steps are readable through trace access"
on public.trace_steps for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.trace_sessions trace
    where trace.id = trace_id
      and public.is_workspace_member(trace.workspace_id)
  )
);

create policy "trace steps are insertable by actor"
on public.trace_steps for insert
with check (user_id = auth.uid());

create policy "trace logs are readable through trace access"
on public.trace_logs for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.trace_sessions trace
    where trace.id = trace_id
      and public.is_workspace_member(trace.workspace_id)
  )
);

create policy "trace logs are insertable by actor"
on public.trace_logs for insert
with check (user_id = auth.uid());

create policy "prompt intelligence is readable by actor or workspace"
on public.prompt_intelligence for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "prompt intelligence is writable by actor"
on public.prompt_intelligence for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "prompt releases are readable by actor or workspace"
on public.prompt_releases for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "prompt releases are writable by actor"
on public.prompt_releases for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
