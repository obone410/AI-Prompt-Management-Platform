create table if not exists public.ai_trace_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ai_runs(id) on delete cascade,
  trace_id uuid references public.trace_sessions(id) on delete cascade,
  node_id uuid,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_event_id uuid references public.ai_trace_events(id) on delete set null,
  event_type text not null check (
    event_type in (
      'run.started',
      'node.started',
      'model.called',
      'tool.called',
      'artifact.created',
      'metric.recorded',
      'run.completed',
      'run.failed'
    )
  ),
  label text not null default '',
  level text not null default 'info' check (level in ('info', 'warning', 'error')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  input_token_estimate integer not null default 0 check (input_token_estimate >= 0),
  output_token_estimate integer not null default 0 check (output_token_estimate >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.trace_nodes (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null references public.trace_sessions(id) on delete cascade,
  run_id uuid references public.ai_runs(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_node_id uuid references public.trace_nodes(id) on delete set null,
  label text not null default '',
  kind text not null check (
    kind in (
      'run',
      'prompt',
      'model',
      'tool',
      'condition',
      'loop',
      'parallel',
      'artifact',
      'release',
      'metric'
    )
  ),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  depth integer not null default 0 check (depth >= 0),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  input_token_estimate integer not null default 0 check (input_token_estimate >= 0),
  output_token_estimate integer not null default 0 check (output_token_estimate >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  error_message text,
  metadata jsonb not null default '{}',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.benchmark_results (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid references public.benchmark_suites(id) on delete cascade,
  benchmark_run_id uuid references public.benchmark_runs(id) on delete cascade,
  ai_run_id uuid references public.ai_runs(id) on delete set null,
  prompt_id uuid references public.prompts(id) on delete set null,
  dataset_id uuid references public.benchmark_datasets(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  task_type text not null default 'general',
  correctness integer not null default 0 check (correctness between 0 and 100),
  hallucination_rate integer not null default 0 check (hallucination_rate between 0 and 100),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  consistency_score integer not null default 0 check (consistency_score between 0 and 100),
  rubric_score integer not null default 0 check (rubric_score between 0 and 100),
  output text not null default '',
  expected_output text not null default '',
  regression_delta integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_tool_calls (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid references public.agent_runs(id) on delete cascade,
  ai_run_id uuid references public.ai_runs(id) on delete set null,
  trace_id uuid references public.trace_sessions(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete cascade,
  tool_name text not null,
  tool_kind text not null check (tool_kind in ('search', 'database', 'code', 'ticketing', 'http', 'evaluation')),
  input_summary text not null default '',
  output_summary text not null default '',
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  token_estimate integer not null default 0 check (token_estimate >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  created_at timestamptz not null default now()
);

create index if not exists ai_trace_events_workspace_created_idx
on public.ai_trace_events (workspace_id, created_at desc);

create index if not exists ai_trace_events_run_idx
on public.ai_trace_events (run_id, created_at);

create index if not exists ai_trace_events_trace_idx
on public.ai_trace_events (trace_id, created_at);

create index if not exists trace_nodes_trace_depth_idx
on public.trace_nodes (trace_id, depth, started_at);

create index if not exists trace_nodes_run_idx
on public.trace_nodes (run_id);

create index if not exists benchmark_results_suite_idx
on public.benchmark_results (suite_id, created_at desc);

create index if not exists benchmark_results_workspace_task_idx
on public.benchmark_results (workspace_id, task_type, created_at desc);

create index if not exists agent_tool_calls_agent_run_idx
on public.agent_tool_calls (agent_run_id, created_at desc);

create index if not exists agent_tool_calls_workspace_idx
on public.agent_tool_calls (workspace_id, created_at desc);

alter table public.ai_trace_events enable row level security;
alter table public.trace_nodes enable row level security;
alter table public.benchmark_results enable row level security;
alter table public.agent_tool_calls enable row level security;

create policy "ai trace events are readable by actor or workspace"
on public.ai_trace_events for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "ai trace events are insertable by actor"
on public.ai_trace_events for insert
with check (user_id = auth.uid());

create policy "trace nodes are readable by actor or workspace"
on public.trace_nodes for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "trace nodes are insertable by actor"
on public.trace_nodes for insert
with check (user_id = auth.uid());

create policy "benchmark results are readable by actor or workspace"
on public.benchmark_results for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "benchmark results are insertable by actor"
on public.benchmark_results for insert
with check (user_id = auth.uid());

create policy "agent tool calls are readable by actor or workspace"
on public.agent_tool_calls for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "agent tool calls are insertable by actor"
on public.agent_tool_calls for insert
with check (user_id = auth.uid());
