# Security Notes

PromptDeck AI v2.0 is designed so public keys can be committed only through `.env.example`, while real credentials stay in `.env.local`, Vercel project secrets, or Supabase project settings.

## Implemented Checks

- Supabase credentials are read from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is supported only as a compatibility fallback for older Supabase dashboards.
- OpenAI credentials are server-only through `OPENAI_API_KEY`.
- `.gitignore` excludes `.env*` and explicitly allows only `.env.example`.
- AI test, evaluation, and optimization requests validate payload size with Zod before calling provider adapters.
- Evaluation and experiment views use estimated token/cost metrics only; no provider billing secrets are exposed to the browser.
- API routes use Upstash Redis rate limiting when configured and a local fallback for development.
- Live OpenAI tests/evaluations/optimizations require a Supabase session when Supabase and OpenAI are both configured.
- Explicit demo-mode tests return a deterministic response without calling OpenAI.
- Claude and Gemini are represented through server-side adapter contracts; no browser-side provider keys are used.
- Observability hooks keep Sentry/PostHog-style event capture server-side.
- OpenTelemetry-compatible spans are emitted through a server-side extension point without exposing collector secrets.
- Production responses set CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, and COOP headers.
- Supabase migration enables Row Level Security on all user data tables.
- RLS policies restrict private prompts, categories, profiles, prompt runs, versions, evaluations, experiments, experiment variants/results, deployments, workflow definitions/runs, organizations, audit logs, activity, workspace members, and invites.
- Public prompt sharing is exposed through `get_public_prompt_by_slug`, which returns one prompt by slug only when `is_public = true`.
- Search, category, favorite, share, and run-history indexes are included for large datasets.

## Supabase RLS Summary

| Object | Access Rule |
| --- | --- |
| `profiles` | Users can read and update only their own profile. |
| `prompt_categories` | Users can create, read, update, and delete only their own categories. |
| `prompts` | Users can create, read, update, and delete only their own prompts. |
| `prompt_runs` | Users can read and delete only their own runs; inserts must reference one of their prompts. |
| `prompt_versions` | Owners and workspace members can read; owner writes and trigger snapshots preserve history. |
| `prompt_evaluations` | Owners and workspace members can read; owner writes benchmark results. |
| `experiments` / `experiment_runs` | Creators can write; creators and workspace members can read. |
| `prompt_deployments` / `deployment_history` | Owners can write; owners and workspace members can read. |
| `ai_workflows` / `workflow_runs` | Owners can write; owners and workspace members can read. |
| `organizations` / `organization_members` | Owner-managed organization access. |
| `audit_logs` | Actor insert; actor or workspace member read. |
| `workspaces` | Owners and members can read; owner manages. |
| `workspace_members` | Workspace members can read; owner manages. |
| `get_public_prompt_by_slug` | Anonymous and authenticated clients can fetch one public prompt by exact share slug. |

## Production Hardening

- Use Supabase publishable keys in the browser and keep secret keys server-only.
- Never add `SUPABASE_SERVICE_ROLE_KEY` to `NEXT_PUBLIC_*` variables or client bundles.
- Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production for distributed rate limits.
- Set Vercel environment variables per environment and never expose `OPENAI_API_KEY` to the client.
- Keep `POSTHOG_PROJECT_API_KEY`, `SENTRY_DSN`, and Upstash tokens server-side.
- Configure Preview environment variables before using Vercel preview deployments.
- Configure Supabase Auth email redirect URLs for local preview, Vercel preview, and production.
- Turn on Supabase leaked password protection and MFA for admin accounts.
- Add monitoring for `/api/test-prompt`, `/api/evaluate-prompt`, and `/api/optimize-prompt` latency, 429s, provider errors, and token spend.
- For already large production tables, create new indexes concurrently in separate migrations.

## Latest Audit

The latest production security pass is documented in `docs/SECURITY_AUDIT_2026-05-16.md`. It confirmed that deployed assets do not expose OpenAI, Vercel, or Supabase service-role secrets; only the expected public Supabase browser URL/key were present.
