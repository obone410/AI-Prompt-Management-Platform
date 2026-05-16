# PromptDeck AI — PromptOps Platform Architecture

PromptDeck AI — PromptOps Platform positions prompt management as AI workflow infrastructure: teams capture prompts, manage variables, version changes, run evaluations, optimize prompt quality, share collections, and observe usage.

## Product Surface

- PromptOps console: CRUD, search, favorites, sharing, export, variables, and versioning
- AI Lab: test prompts, compare model adapters, inspect metrics, and optimize prompts
- Analytics: category usage, frequency, latency, favorites, and activity timelines
- Team foundations: workspaces, members, roles, invites, and shared collections

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
  Jobs --> Providers["Provider adapter layer"]
  Providers --> OpenAI["OpenAI SDK"]
  Providers --> Claude["Claude adapter contract"]
  Providers --> Gemini["Gemini adapter contract"]

  SupabaseBrowser --> Postgres["Supabase Postgres"]
  Postgres --> RLS["Row Level Security"]
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
```

## ERD

```mermaid
erDiagram
  profiles ||--o{ prompt_categories : owns
  profiles ||--o{ prompts : owns
  profiles ||--o{ prompt_runs : records
  profiles ||--o{ prompt_versions : snapshots
  profiles ||--o{ prompt_evaluations : evaluates
  profiles ||--o{ workspaces : owns
  workspaces ||--o{ workspace_members : includes
  workspaces ||--o{ workspace_invites : invites
  workspaces ||--o{ prompt_collections : groups
  prompt_categories ||--o{ prompts : categorizes
  prompts ||--o{ prompt_versions : versions
  prompts ||--o{ prompt_runs : tests
  prompts ||--o{ prompt_evaluations : benchmarks
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
  Adapter --> Response["Metrics response"]
  Demo --> Response
```

## Security Posture

- Provider calls happen only in server routes.
- OpenAI key is never exposed through `NEXT_PUBLIC_*`.
- Supabase browser keys are public by design and protected by RLS.
- Live provider spend requires a Supabase session.
- Prompt/evaluation payloads are validated with Zod.
- Production responses set CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, and COOP.
- New PromptOps tables include RLS policies for owner/member access.

## Scaling Notes

- Dashboard queries remain scoped by `user_id` or workspace membership.
- Prompt search uses generated full-text vectors and GIN indexes.
- Prompt versions and evaluations are append-oriented for auditability.
- Upstash Redis rate limits work across serverless regions.
- Background job abstraction can be swapped from inline execution to queue workers.
- Large workspaces should move from load-more UI to cursor pagination backed by `(workspace_id, updated_at, id)` indexes.
