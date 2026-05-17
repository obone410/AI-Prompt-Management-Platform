# Security Notes

PromptDeck AI keeps real credentials out of the browser and out of Git. Public Supabase browser keys are allowed, but provider secrets, service-role keys, and deployment tokens must stay in `.env.local`, Vercel secrets, or Supabase project settings.

## Security Model

- AI provider calls run only through server-side API routes.
- API payloads are validated with Zod before provider logic runs.
- Live AI calls require a Supabase session when production Supabase/OpenAI credentials are configured.
- Demo mode returns deterministic responses without spending provider quota.
- Upstash Redis is used for distributed rate limiting when configured, with a local fallback for development.
- Supabase Row Level Security protects prompts, versions, runs, traces, agents, benchmarks, workflows, deployments, organizations, workspaces, and audit data.
- Public prompt sharing is limited to exact public slugs through `get_public_prompt_by_slug`.
- Production responses set CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, and COOP headers.

## Credential Rules

Never expose these values in client code or `NEXT_PUBLIC_*` variables:

- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Vercel tokens
- Upstash Redis tokens
- Sentry/PostHog server-side secrets

Expected public values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- optional legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Production Checklist

- Add Vercel environment variables for Production, Preview, and Development.
- Configure Supabase Auth redirect URLs for local, preview, and production.
- Enable Supabase leaked-password protection and MFA for admin accounts.
- Configure Upstash Redis for production rate limiting.
- Monitor AI API latency, `401`, `429`, provider errors, and token spend.
- Keep database indexes and append-only execution logs ready for partitioning as usage grows.

## Latest Verification

The latest local and production checks confirmed:

- `npm audit --audit-level=moderate` found `0` vulnerabilities.
- Source scan found no committed OpenAI, Vercel, Supabase service-role, or Redis secrets.
- Production asset scan found no provider secrets in deployed HTML or JavaScript.
- Public Supabase browser config is visible as expected and protected by RLS.
- Unauthenticated live AI requests return `401`.

Detailed audit notes are in [docs/SECURITY_AUDIT_2026-05-17.md](docs/SECURITY_AUDIT_2026-05-17.md).
