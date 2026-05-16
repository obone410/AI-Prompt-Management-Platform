# PromptDeck AI v2.0 — AI Workflow Operating System Architecture

PromptDeck AI v2.0 positions prompt work as AI workflow infrastructure: teams capture prompt lifecycle changes, run LLMOps experiments, evaluate model behavior, deploy prompt versions across environments, orchestrate workflow pipelines, and observe usage, cost, quality, and latency.

## Product Surface

- PromptOps console: CRUD, search, favorites, sharing, export, variables, and versioning
- Experiments: compare prompt variants, inspect winners, review expandable outputs, and track latency/token/cost tradeoffs
- Experiment workflows: reusable datasets, scoring presets, status lifecycle, aggregate metrics, and benchmark history
- Deployments: Development/Staging/Production promotion, rollback, deployment logs, and release metadata
- Workflow Studio: prompt, variable, condition, and output nodes with execution timeline and run logs
- AI evaluation suite: test prompts, compare model adapters, inspect metrics, and optimize prompts
- Analytics: provider efficiency, token usage, estimated spend, cheapest provider, fastest provider, latency, and activity timelines
- Team foundations: organizations, workspaces, members, roles, invites, shared collections, and audit logs

## Runtime Architecture

```mermaid
flowchart TD
  Browser["React 19 PromptOps UI"] --> LocalStore["Local demo workspace"]
  Browser --> SupabaseBrowser["Supabase browser client"]
  Browser --> Routes["Next.js API routes"]

  Routes --> Auth["Supabase session check"]
  Routes --> Zod["Zod payload validation"]
  Routes --> RateLimit["Upstash Redis rate limiter"]
  Routes --> Jobs["Evaluation job abstraction"]
  Routes --> Observability["PostHog/Sentry-style hooks"]
  Routes --> OTel["OpenTelemetry span hook"]
  Jobs --> Providers["Provider adapter layer"]
  Providers --> OpenAI["OpenAI SDK"]
  Providers --> Claude["Claude adapter contract"]
  Providers --> Gemini["Gemini adapter contract"]

  SupabaseBrowser --> Postgres["Supabase Postgres"]
  Postgres --> RLS["Row Level Security"]
  Postgres --> AppendOnly["Append-only runs, deployments, audits"]
```

## PromptOps Lifecycle

```mermaid
sequenceDiagram
  participant User
  participant UI as PromptDeck AI
  participant API as Next API
  participant AI as Provider Adapter
  participant DB as Supabase

  User->>UI: Create or edit prompt
  UI->>UI: Detect variables and render preview
  UI->>DB: Persist prompt through RLS
  DB->>DB: Trigger prompt_versions snapshot on update
  User->>UI: Run side-by-side evaluation
  UI->>API: POST /api/evaluate-prompt
  API->>API: Validate, rate-limit, check session
  API->>AI: Run selected model adapters
  AI-->>API: Outputs and metrics
  API-->>UI: Evaluation cards
  UI->>DB: Persist evaluation history when signed in
  User->>UI: Run prompt experiment
  UI->>API: Evaluate variants through adapter layer
  UI->>DB: Persist experiment, variants, result metrics, token and cost estimates
  User->>UI: Deploy prompt version
  UI->>DB: Write prompt_deployments and deployment_history
  User->>UI: Run workflow pipeline
  UI->>DB: Store workflow_runs with timeline logs
```

## ERD

```mermaid
erDiagram
  profiles ||--o{ prompt_categories : owns
  profiles ||--o{ prompts : owns
  profiles ||--o{ prompt_runs : records
  profiles ||--o{ prompt_versions : snapshots
  profiles ||--o{ prompt_evaluations : evaluates
  profiles ||--o{ prompt_experiments : owns
  profiles ||--o{ experiments : creates
  profiles ||--o{ prompt_deployments : deploys
  profiles ||--o{ ai_workflows : owns
  profiles ||--o{ organizations : owns
  profiles ||--o{ workspaces : owns
  organizations ||--o{ organization_members : includes
  organizations ||--o{ audit_logs : records
  workspaces ||--o{ workspace_members : includes
  workspaces ||--o{ workspace_invites : invites
  workspaces ||--o{ prompt_collections : groups
  prompt_categories ||--o{ prompts : categorizes
  prompts ||--o{ prompt_versions : versions
  prompts ||--o{ prompt_runs : tests
  prompts ||--o{ prompt_evaluations : benchmarks
  prompts ||--o{ prompt_experiments : experiments
  prompt_experiments ||--o{ prompt_experiment_variants : compares
  prompt_experiment_variants ||--o{ prompt_experiment_results : produces
  experiments ||--o{ experiment_runs : benchmarks
  prompts ||--o{ prompt_deployments : releases
  prompt_deployments ||--o{ deployment_history : logs
  ai_workflows ||--o{ workflow_runs : executes
  prompt_collections ||--o{ collection_prompts : contains
  prompts ||--o{ collection_prompts : listed
```

## API Flow

```mermaid
flowchart LR
  Request["Client request"] --> Parse["Zod schema parse"]
  Parse --> Limit["Upstash Redis rate limit"]
  Limit --> Session{"Live provider spend?"}
  Session -->|Yes| Auth["Require Supabase session"]
  Session -->|No demo| Demo["Deterministic demo response"]
  Auth --> Adapter["Provider adapter"]
  Adapter --> Telemetry["Telemetry and observability"]
  Telemetry --> Response["Metrics response"]
  Demo --> Response
```

## Security Posture

- Provider calls happen only in server routes.
- OpenAI key is never exposed through `NEXT_PUBLIC_*`.
- Supabase browser keys are public by design and protected by RLS.
- Live provider spend requires a Supabase session.
- Prompt/evaluation payloads are validated with Zod.
- Evaluation responses include estimated input tokens, output tokens, output length, latency, quality sub-scores, and estimated cost.
- Deployment, workflow, organization, experiment, and audit tables use RLS with owner/member access checks.
- Production responses set CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, and COOP.
- New PromptOps tables include RLS policies for owner/member access.

## Scaling Notes

- Dashboard queries remain scoped by `user_id` or workspace membership.
- Prompt search uses generated full-text vectors and GIN indexes.
- Prompt versions, evaluations, and experiment results are append-oriented for auditability.
- Experiment runs, deployment history, workflow runs, and audit logs are append-oriented for auditability.
- Upstash Redis rate limits work across serverless regions.
- Background job abstraction can be swapped from inline execution to queue workers.
- Experiment result tables are separated from variants so high-volume benchmark history can be paginated, archived, or moved to warehouse storage.
- Deployment environments are modeled separately from prompt content so releases can roll back without rewriting prompt history.
- Workflow run logs are stored separately from workflow definitions so execution history can scale independently.
- Large workspaces should move from load-more UI to cursor pagination backed by `(workspace_id, updated_at, id)` indexes.
