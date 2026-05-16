# Supabase Setup

PromptDeck OS includes Supabase schema, indexes, triggers, RPCs, and RLS policies in `supabase/migrations`.

## Migration Order

Apply migrations in filename order:

1. `202605150001_initial_promptdeck_schema.sql`
2. `202605160001_harden_public_prompt_sharing.sql`
3. `202605160002_promptops_operating_system.sql`

The first migration creates the original prompt workspace. The second tightens public sharing so anonymous users cannot list all public prompts from `prompts`. The third adds PromptOps production foundations: workspaces, members, collections, versions, evaluations, activity, invites, Redis-ready API architecture support, and automatic version snapshots.

## Tables

- `profiles`: one row per Supabase Auth user
- `prompt_categories`: user-owned prompt groups
- `prompts`: prompt content, model settings, search vector, favorite state, and share slug
- `prompt_runs`: single prompt test history
- `prompt_versions`: historical prompt snapshots with changelog notes
- `prompt_evaluations`: side-by-side model benchmark results
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
- Evaluations: `prompt_evaluations_prompt_idx`, `prompt_evaluations_user_idx`
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
