# Supabase Setup

PromptDeck AI v2.0 includes Supabase schema, indexes, triggers, RPCs, and RLS policies in `supabase/migrations`.

## Migration Order

Apply migrations in filename order:

1. `202605150001_initial_promptdeck_schema.sql`
2. `202605160001_harden_public_prompt_sharing.sql`
3. `202605160002_promptops_operating_system.sql`
4. `202605160003_prompt_experiments_costs.sql`
5. `202605160004_ai_workflow_operating_system.sql`

The fifth migration adds v2.0 AI workflow operating-system tables: organizations, audit logs, `experiments`, `experiment_runs`, evaluation datasets/presets, prompt deployments, deployment history, AI workflows, and workflow run logs.

## Tables

- `profiles`: one row per Supabase Auth user
- `prompt_categories`: user-owned prompt groups
- `prompts`: prompt content, model settings, search vector, favorite state, and share slug
- `prompt_runs`: single prompt test history
- `prompt_versions`: historical prompt snapshots with changelog notes
- `prompt_evaluations`: side-by-side model benchmark results with latency, token, cost, and quality metrics
- `prompt_experiments`: LLM experiment hypotheses and status
- `prompt_experiment_variants`: prompt A/B variants linked to experiments
- `prompt_experiment_results`: model outputs, latency, tokens, cost, quality score, and hallucination-risk metrics
- `experiments`: full LLMOps experiments with prompt ids, models, datasets, metrics, creator, and status
- `experiment_runs`: benchmark outputs and rubric metrics per prompt/model/dataset run
- `evaluation_datasets`: reusable datasets/examples for evaluations
- `evaluation_presets`: reusable scoring templates and rubrics
- `prompt_deployments`: prompt version releases to development, staging, or production
- `deployment_history`: promotion, rollback, and release event timeline
- `ai_workflows`: node/edge workflow graph definitions
- `workflow_runs`: execution logs, token estimates, cost, and latency
- `organizations`: enterprise ownership boundary
- `organization_members`: organization roles and permissions
- `audit_logs`: immutable activity/audit feed target
- `prompt_activity`: workspace activity timeline events
- `workspaces`: ownership boundary for teams
- `workspace_members`: team role assignments
- `workspace_invites`: invite UI persistence target
- `prompt_collections`: shared prompt sets
- `collection_prompts`: prompt-to-collection join table

## RLS Policy Matrix

| Table | Access Model |
| --- | --- |
| `profiles` | Users can read/update only their own profile. |
| `prompt_categories` | Owner-only CRUD. |
| `prompts` | Owner-only CRUD; public reads happen only through slug RPC. |
| `prompt_runs` | Owner-only read/insert/delete. |
| `prompt_versions` | Owner or workspace member read; owner insert; automatic trigger snapshots on prompt edits. |
| `prompt_evaluations` | Owner or workspace member read; owner insert. |
| `prompt_experiments` | Owner or workspace member read; owner insert/update. |
| `prompt_experiment_variants` | Read/write through experiment ownership and workspace membership. |
| `prompt_experiment_results` | Owner or workspace member read; owner insert. |
| `experiments` | Creator or workspace member read; creator writes. |
| `experiment_runs` | Actor or workspace member read; actor inserts. |
| `evaluation_datasets` | Owner or workspace member read; owner writes. |
| `evaluation_presets` | Owner or workspace member read; owner writes. |
| `prompt_deployments` | Owner or workspace member read; owner writes. |
| `deployment_history` | Read through deployment access; actor inserts. |
| `ai_workflows` | Owner or workspace member read; owner writes. |
| `workflow_runs` | Read through workflow access; actor inserts. |
| `organizations` | Owner/member read; owner writes. |
| `organization_members` | Organization members can read; owner manages. |
| `audit_logs` | Actor or workspace member read; actor inserts. |
| `prompt_activity` | Owner or workspace member read; owner insert. |
| `workspaces` | Owner/member read; owner write. |
| `workspace_members` | Workspace members can read; owner manages. |
| `workspace_invites` | Workspace members can read; owner manages. |
| `prompt_collections` | Owner/private, workspace, or public visibility. |
| `collection_prompts` | Read/write through collection ownership and visibility. |

Public prompt reads use:

```sql
select * from public.get_public_prompt_by_slug('product-brief');
```

That function returns one shared prompt by exact slug and only when `is_public = true`.

## Versioning Trigger

`capture_prompt_version_before_update` automatically writes the previous prompt state into `prompt_versions` before important prompt fields change:

- title
- description
- content
- tags
- model
- temperature

The app also keeps local demo-mode versions with user-facing changelog notes and rollback support.

## Indexing And Scale

- Dashboard reads: `prompts_user_updated_idx`
- Category filters: `prompts_user_category_idx`
- Favorites: `prompts_user_favorite_idx`
- Public share lookup: `prompts_public_share_slug_idx`
- Tag filters: `prompts_tags_idx`
- Full-text search: `prompts_search_document_idx`
- Run history: `prompt_runs_prompt_created_idx`, `prompt_runs_user_created_idx`
- Versions: `prompt_versions_prompt_idx`
- Evaluations: `prompt_evaluations_prompt_idx`, `prompt_evaluations_user_idx`, `prompt_evaluations_cost_idx`
- Experiments: `prompt_experiments_workspace_idx`, `prompt_experiments_user_idx`, `prompt_experiment_variants_experiment_idx`, `prompt_experiment_results_experiment_idx`, `prompt_experiment_results_variant_idx`
- v2 experiments: `experiments_workspace_idx`, `experiments_status_idx`, `experiment_runs_experiment_idx`, `experiment_runs_model_idx`
- Deployments: `prompt_deployments_env_idx`, `deployment_history_deployment_idx`
- Workflows: `ai_workflows_workspace_idx`, `workflow_runs_workflow_idx`
- Organizations/audit: `organizations_owner_idx`, `organization_members_user_idx`, `audit_logs_workspace_idx`
- Workspaces: `workspaces_owner_idx`, `workspace_members_user_idx`
- Activity: `prompt_activity_workspace_idx`

For production tables that already contain large data volumes, create new indexes concurrently in separate migrations outside a transaction.

## Environment Variables

Use `.env.example` as the local template and set the same keys in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
POSTHOG_PROJECT_API_KEY=
POSTHOG_HOST=https://app.posthog.com
```

Only `NEXT_PUBLIC_*` values are allowed in the browser. Keep OpenAI keys, Upstash tokens, PostHog project keys, and Supabase service-role keys out of client code.
