# Security Notes

PromptDeck AI is designed so public keys can be committed only through `.env.example`, while real credentials stay in `.env.local`, Vercel project secrets, or Supabase project settings.

## Implemented Checks

- Supabase credentials are read from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- OpenAI credentials are server-only through `OPENAI_API_KEY`.
- `.gitignore` excludes `.env*` and explicitly allows only `.env.example`.
- AI test requests validate payload size with Zod before calling the provider.
- The AI test route has a per-IP in-memory limiter for local/dev safety.
- Supabase migration enables Row Level Security on all user data tables.
- RLS policies restrict private prompts, categories, profiles, and prompt runs to the owning user.
- Public prompt sharing is limited to rows marked `is_public = true`.
- Search, category, favorite, share, and run-history indexes are included for large datasets.

## Production Hardening

- Use Supabase publishable keys in the browser and keep secret keys server-only.
- Replace the local route limiter with a durable distributed limiter such as Upstash or a Vercel KV-backed token bucket.
- Set Vercel environment variables per environment and never expose `OPENAI_API_KEY` to the client.
- Configure Supabase Auth email redirect URLs for local preview, Vercel preview, and production.
- Turn on Supabase leaked password protection and MFA for admin accounts.
- Add monitoring for `/api/test-prompt` latency, 429s, provider errors, and token spend.
- For already large production tables, create new indexes concurrently in separate migrations.
