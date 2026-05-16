# Security Notes

PromptDeck AI is designed so public keys can be committed only through `.env.example`, while real credentials stay in `.env.local`, Vercel project secrets, or Supabase project settings.

## Implemented Checks

- Supabase credentials are read from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is supported only as a compatibility fallback for older Supabase dashboards.
- OpenAI credentials are server-only through `OPENAI_API_KEY`.
- `.gitignore` excludes `.env*` and explicitly allows only `.env.example`.
- AI test requests validate payload size with Zod before calling the provider.
- The AI test route has a per-IP in-memory limiter for local/dev safety.
- Supabase migration enables Row Level Security on all user data tables.
- RLS policies restrict private prompts, categories, profiles, and prompt runs to the owning user.
- Public prompt sharing is exposed through `get_public_prompt_by_slug`, which returns one prompt by slug only when `is_public = true`.
- Search, category, favorite, share, and run-history indexes are included for large datasets.

## Supabase RLS Summary

| Object | Access Rule |
| --- | --- |
| `profiles` | Users can read and update only their own profile. |
| `prompt_categories` | Users can create, read, update, and delete only their own categories. |
| `prompts` | Users can create, read, update, and delete only their own prompts. |
| `prompt_runs` | Users can read and delete only their own runs; inserts must reference one of their prompts. |
| `get_public_prompt_by_slug` | Anonymous and authenticated clients can fetch one public prompt by exact share slug. |

## Production Hardening

- Use Supabase publishable keys in the browser and keep secret keys server-only.
- Never add `SUPABASE_SERVICE_ROLE_KEY` to `NEXT_PUBLIC_*` variables or client bundles.
- Replace the local route limiter with a durable distributed limiter such as Upstash or a Vercel KV-backed token bucket.
- Set Vercel environment variables per environment and never expose `OPENAI_API_KEY` to the client.
- Configure Supabase Auth email redirect URLs for local preview, Vercel preview, and production.
- Turn on Supabase leaked password protection and MFA for admin accounts.
- Add monitoring for `/api/test-prompt` latency, 429s, provider errors, and token spend.
- For already large production tables, create new indexes concurrently in separate migrations.
