# Supabase Setup

PromptDeck AI includes production-ready Supabase schema and RLS migrations in `supabase/migrations`.

## Migration Order

Apply migrations in filename order:

1. `202605150001_initial_promptdeck_schema.sql`
2. `202605160001_harden_public_prompt_sharing.sql`

The first migration creates the app tables, indexes, triggers, generated search vector, and owner-based policies. The second migration tightens public prompt sharing so anonymous users cannot list all public prompts directly from `prompts`; shared prompts are fetched through the slug-scoped `get_public_prompt_by_slug` RPC.

## Tables

- `profiles`: one row per Supabase Auth user
- `prompt_categories`: user-owned prompt groups
- `prompts`: prompt content, model settings, search vector, favorite state, and share slug
- `prompt_runs`: AI test history for prompt runs

## RLS Policy Matrix

| Table | Select | Insert | Update | Delete |
| --- | --- | --- | --- | --- |
| `profiles` | Owner only | Auth trigger | Owner only | Cascade through auth user deletion |
| `prompt_categories` | Owner only | Owner only | Owner only | Owner only |
| `prompts` | Owner only | Owner only | Owner only | Owner only |
| `prompt_runs` | Owner only | Owner only, prompt must belong to owner | Not exposed | Owner only |

Public prompt reads use:

```sql
select * from public.get_public_prompt_by_slug('product-brief');
```

That function returns one shared prompt by slug and only when `is_public = true`.

## Indexing And Scale

- Dashboard reads: `prompts_user_updated_idx`
- Category filters: `prompts_user_category_idx`
- Favorites: `prompts_user_favorite_idx`
- Public share lookup: `prompts_public_share_slug_idx`
- Tag filters: `prompts_tags_idx`
- Full-text search: `prompts_search_document_idx`
- Run history: `prompt_runs_prompt_created_idx`, `prompt_runs_user_created_idx`

For production tables that already contain large data volumes, add new indexes in later migrations with `CREATE INDEX CONCURRENTLY` outside a transaction.

## Environment Variables

Use `.env.example` as the local template and set the same keys in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5
```

Only `NEXT_PUBLIC_*` values are allowed in the browser. Keep OpenAI keys and any Supabase service-role keys out of client code.
