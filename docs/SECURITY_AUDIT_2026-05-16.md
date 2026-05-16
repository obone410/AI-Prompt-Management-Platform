# Security Audit - 2026-05-16

Target: `https://ai-prompt-management-platform.vercel.app`

The production alias was checked after the hardened Vercel deployment completed, then refreshed after the v3.0 AI Operations Platform deployment.

## Scope

- Deployed production website and generated Next.js client assets.
- Prompt dashboard, public share route, AI testing API route, AI operations command center, benchmark engine, agent builder, release center, and observability center.
- Repository dependency audit and tracked-file secret scan.
- Vercel production environment configuration presence, without exposing values.

## Threat Model Summary

Primary assets are user prompts, unified AI runs, trace logs, benchmark results, agent memory, release history, Supabase Auth sessions, Supabase row-level boundaries, the server-only OpenAI key, Vercel deployment settings, and AI usage spend.

Main attacker-controlled inputs are prompt titles, descriptions, bodies, tags, test inputs, share slugs, auth form values, local storage content, and HTTP requests to public routes. The app must preserve owner-only data access, keep provider credentials server-side, expose only intentionally public prompts, and prevent unauthenticated users from spending live AI quota.

## Findings And Fixes

| Finding | Risk | Status |
| --- | --- | --- |
| Missing browser hardening headers on production responses. | Weaker browser isolation and clickjacking/CSP posture. | Fixed in `next.config.ts` with CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, and COOP. |
| Public AI test route could call live OpenAI without a Supabase session. | Cost-abuse risk even though the OpenAI key was not exposed. | Fixed in `src/app/api/test-prompt/route.ts`; live OpenAI tests now require a Supabase session when Supabase is configured. |
| Public share pages only used local browser storage. | Shared links could fail in a clean browser and did not use the hardened slug RPC. | Fixed in `/share/[slug]`; the page now attempts `get_public_prompt_by_slug` server-side and falls back to local demo data. |

No high or critical exploitable vulnerability survived validation after these fixes.

## Secret Exposure Check

Deployed HTML and 8 generated Next.js JavaScript assets were scanned for secret-shaped values:

- No OpenAI secret key values found.
- No Vercel token found.
- No Supabase service-role key or `service_role` marker found.
- No `OPENAI_API_KEY` text found in deployed assets.
- Supabase URL and publishable key were present in one client chunk; this is expected because `NEXT_PUBLIC_*` Supabase browser config is intentionally public and protected by RLS.

Tracked source scan also found no committed OpenAI project secret, Supabase service JWT, Supabase secret key, or Vercel token values.

## Live Production Verification

Security headers on `https://ai-prompt-management-platform.vercel.app`:

- `Content-Security-Policy`: present
- `Strict-Transport-Security`: present
- `X-Frame-Options`: present
- `X-Content-Type-Options`: present
- `Referrer-Policy`: present
- `Permissions-Policy`: present
- `Cross-Origin-Opener-Policy`: present

Unauthenticated live AI route probe:

- `POST /api/test-prompt`: `401`
- Result: live provider spend is blocked without a Supabase session.

Browser QA:

- Homepage status: `200`
- Share route status: `200`
- Production title: `PromptDeck AI v3.0 — AI Operations Platform`
- Version marker visible: `AI Operations OS v3.0.0`
- Console errors: `0`
- Failed requests: `0`
- 4xx/5xx page asset responses: `0`
- Demo flow: signed into local demo mode without creating a Supabase account.
- UI surfaces checked: Operations, Benchmarks, Agents, Workflows, Releases, Observability, Analytics, and Team.

Performance spot check:

| Route | DOMContentLoaded | Load | FCP | Transferred |
| --- | ---: | ---: | ---: | ---: |
| `/` | 474 ms | 768 ms | 548 ms | 458 KB |
| `/share/product-brief` | 928 ms | 995 ms | 944 ms | 224 KB |

Supabase production schema:

- Migration `ai_operations_platform` applied to project `gujupmdzuonefgliqrdu`.
- All 16 new v3 tables have RLS enabled.
- New RLS-protected surfaces include `ai_runs`, `ai_artifacts`, `ai_metrics`, `agents`, `agent_runs`, `agent_memory`, `agent_tools`, `benchmark_suites`, `benchmark_datasets`, `benchmark_runs`, `benchmark_scores`, `trace_sessions`, `trace_steps`, `trace_logs`, `prompt_intelligence`, and `prompt_releases`.

Screenshot artifact:

- `docs/screenshots/live-production-security.png`

## Local Verification

All local checks passed after the security fixes:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

Audit result:

```text
found 0 vulnerabilities
```

## Dependency Freshness

Safe runtime patch updates applied:

- `openai`: `6.38.0`
- `react`: `19.2.6`
- `react-dom`: `19.2.6`

Remaining `npm outdated` entries are major-version dev/runtime-type tracks held for compatibility review rather than forced into this production patch:

- `@types/node`: current Node 20 type line, latest major 25
- `eslint`: current 9 line, latest major 10
- `typescript`: current 5 line, latest major 6

## Residual Production Notes

- Vercel Production and Development environment variables are configured; Preview variables were not present in the CLI listing and should be added before preview deployments are used.
- Supabase public browser keys are not secrets. RLS and the slug-scoped RPC remain the protection boundary.
- For 1 million users, keep `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` configured in production so rate limiting remains distributed across serverless instances. The local in-memory limiter is only a development fallback.
- Keep OpenAI billing/quota healthy before relying on live provider tests in recruiter demos.
