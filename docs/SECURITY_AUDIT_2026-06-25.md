# Security Audit - 2026-06-25

Target: PromptDeck AI v3.2

Production deployment: `dpl_35YsYMbeqU6t2kNsw9E5ARjU7nfz`

Production URL: `https://ai-prompt-management-platform.vercel.app`

## Result

No high or critical security issue was found in the v3.2 refresh. The app keeps live AI provider usage behind authentication, keeps provider secrets server-side, upgrades the current stable Next.js/React/Supabase/OpenAI toolchain, and hardens production response headers.

## Checks Run

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e`
- `npm audit --audit-level=moderate`
- Source secret scan for OpenAI keys, Vercel tokens, Supabase service-role keys, Redis tokens, and accidental populated env assignments.
- Local production browser smoke test across desktop and mobile.
- Local production security header check.
- API probe for unauthenticated live AI access.
- RLS migration review for prompt, workspace, run, trace, benchmark, agent, and release tables.

## Local Production Findings

- Homepage status: `200`
- Local production title: `PromptDeck AI v3.2 — AI Execution OS`
- Version marker visible: `AI Execution OS v3.2.0`
- Browser console errors: `0`
- Failed requests: `0`
- Mobile horizontal overflow: `0px`
- Unauthenticated `POST /api/test-prompt`: `401`
- Dependency audit: `0` vulnerabilities
- Source secret scan: no committed provider or deployment secrets
- Production CSP includes Supabase HTTPS, Supabase websocket, PostHog, and Sentry ingest endpoints.
- Production CSP does not include `unsafe-eval`.
- Response headers include HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP, CORP, X-DNS-Prefetch-Control, X-Permitted-Cross-Domain-Policies, and Origin-Agent-Cluster.

## Live Production Findings

- Homepage status: `200`
- Share route status: `200`
- Production title: `PromptDeck AI v3.2 — AI Execution OS`
- Version marker visible: `AI Execution OS v3.2.0`
- Browser console errors: `0`
- Failed requests: `0`
- Mobile horizontal overflow: `0px`
- Unauthenticated `POST /api/test-prompt`: `401`
- CSP contains Supabase websocket and Sentry ingest endpoints.
- CSP does not include `unsafe-eval`.
- HSTS, CORP, and Origin-Agent-Cluster headers are present.
- Deployed HTML plus `7` generated JavaScript assets were scanned.
- Deployed secret-pattern matches: `0`

## Security Posture

- Provider calls remain server-only through protected API routes.
- Zod validates AI test, evaluation, and optimization payloads.
- Live provider calls require a Supabase session when live Supabase/OpenAI credentials are configured.
- Demo mode returns deterministic responses and does not call OpenAI.
- Upstash Redis rate limiting is used when configured, with a local development fallback.
- Supabase RLS remains the tenant isolation boundary.
- Public sharing remains slug-scoped through exact public slugs.
- Share previews open with `noopener,noreferrer`.
- `.env*` files remain ignored except `.env.example`.

## Toolchain Refresh

- Next.js `16.2.9`
- React `19.2.7`
- OpenAI SDK `6.45.0`
- Supabase JS `2.108.2`
- Supabase SSR `0.12.0`
- Tailwind CSS `4.3.1`
- Playwright `1.61.1`
- Framer Motion `12.42.0`
- Recharts `3.9.0`
- Lucide React `1.21.0`

## Notes

TypeScript 6, ESLint 10, and Node 26 type definitions were intentionally not adopted in this pass because they are major-line migrations. They should be handled in a dedicated migration branch with focused compatibility testing.
