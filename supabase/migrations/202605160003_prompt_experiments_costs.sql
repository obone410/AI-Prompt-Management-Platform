alter table public.prompt_evaluations
  add column if not exists input_token_estimate integer not null default 0 check (input_token_estimate >= 0),
  add column if not exists output_token_estimate integer not null default 0 check (output_token_estimate >= 0),
  add column if not exists estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0);

create table if not exists public.prompt_experiments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  title text not null check (char_length(title) between 2 and 160),
  hypothesis text not null default '',
  status text not null default 'draft' check (status in ('draft', 'running', 'completed', 'archived')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_experiment_variants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.prompt_experiments(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  label text not null check (char_length(label) between 1 and 80),
  content text not null,
  model text not null default 'gpt-5',
  temperature numeric(3,2) not null default 0.40,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_experiment_results (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.prompt_experiments(id) on delete cascade,
  variant_id uuid not null references public.prompt_experiment_variants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'google', 'demo')),
  model text not null,
  output text not null default '',
  latency_ms integer not null default 0 check (latency_ms >= 0),
  input_token_estimate integer not null default 0 check (input_token_estimate >= 0),
  output_token_estimate integer not null default 0 check (output_token_estimate >= 0),
  token_estimate integer not null default 0 check (token_estimate >= 0),
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  output_length integer not null default 0 check (output_length >= 0),
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  hallucination_risk integer not null default 0 check (hallucination_risk between 0 and 100),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

drop trigger if exists set_prompt_experiments_updated_at on public.prompt_experiments;
create trigger set_prompt_experiments_updated_at
before update on public.prompt_experiments
for each row execute function public.set_updated_at();

create index if not exists prompt_evaluations_cost_idx
  on public.prompt_evaluations (user_id, created_at desc, estimated_cost_usd);
create index if not exists prompt_experiments_workspace_idx
  on public.prompt_experiments (workspace_id, updated_at desc);
create index if not exists prompt_experiments_user_idx
  on public.prompt_experiments (user_id, updated_at desc);
create index if not exists prompt_experiment_variants_experiment_idx
  on public.prompt_experiment_variants (experiment_id, created_at);
create index if not exists prompt_experiment_results_experiment_idx
  on public.prompt_experiment_results (experiment_id, created_at desc);
create index if not exists prompt_experiment_results_variant_idx
  on public.prompt_experiment_results (variant_id, created_at desc);

alter table public.prompt_experiments enable row level security;
alter table public.prompt_experiment_variants enable row level security;
alter table public.prompt_experiment_results enable row level security;

create policy "prompt experiments are readable by owner or workspace"
on public.prompt_experiments for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy "prompt experiments are insertable by owner"
on public.prompt_experiments for insert
with check (user_id = auth.uid());

create policy "prompt experiments are updatable by owner"
on public.prompt_experiments for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "prompt experiment variants are readable through experiment"
on public.prompt_experiment_variants for select
using (
  exists (
    select 1
    from public.prompt_experiments experiment
    where experiment.id = experiment_id
      and (
        experiment.user_id = auth.uid()
        or public.is_workspace_member(experiment.workspace_id)
      )
  )
);

create policy "prompt experiment variants are writable by experiment owner"
on public.prompt_experiment_variants for all
using (
  exists (
    select 1
    from public.prompt_experiments experiment
    where experiment.id = experiment_id
      and experiment.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.prompt_experiments experiment
    where experiment.id = experiment_id
      and experiment.user_id = auth.uid()
  )
);

create policy "prompt experiment results are readable by owner or workspace"
on public.prompt_experiment_results for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.prompt_experiments experiment
    where experiment.id = experiment_id
      and public.is_workspace_member(experiment.workspace_id)
  )
);

create policy "prompt experiment results are insertable by owner"
on public.prompt_experiment_results for insert
with check (user_id = auth.uid());
