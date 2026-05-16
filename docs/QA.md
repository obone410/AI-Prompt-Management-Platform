# QA Report

## Local Browser QA

Target: local production server

Coverage:

- Dashboard loads on desktop and mobile viewports.
- Supabase public project configuration loads in the production build.
- Demo auth flow signs into the local workspace.
- Prompt test bench returns the deterministic demo AI response when no OpenAI key is configured.
- Demo access returns a local demo session and deterministic demo AI response even when Supabase/OpenAI env vars are configured.
- Demo access was checked for accidental Supabase signup calls; observed signup requests: `0`.
- AI-assisted prompt optimization renders suggestions in demo mode.
- Side-by-side model evaluation renders GPT and Claude adapter cards in demo mode.
- Experiment workflows render lifecycle status, datasets, reusable rubrics, score trends, and benchmark history.
- Workflow Studio renders prompt, variable, condition, and output nodes with run history and execution logs.
- Deployment Center renders Development, Staging, and Production lifecycle controls with rollback and promotion actions.
- Analytics and Team tabs render from the production build.
- Shared prompt page renders the public prompt preview.
- Screenshots were refreshed from a production build.
- Animated demo GIF was generated from real browser frames.
- Playwright e2e forces demo mode on its own port so tests do not depend on paid AI quota.

Artifacts:

- `docs/screenshots/dashboard-desktop.png`
- `docs/screenshots/experiments-desktop.png`
- `docs/screenshots/workflows-desktop.png`
- `docs/screenshots/deployments-desktop.png`
- `docs/screenshots/dashboard-mobile.png`
- `docs/screenshots/shared-prompt.png`
- `docs/screenshots/live-production-security.png`
- `docs/demos/promptops-demo.gif`

## Production Browser QA

Target: `https://ai-prompt-management-platform.vercel.app`

Result:

- Homepage returned `200`.
- Share route returned `200`.
- Production title returned `PromptDeck AI v2.0 — AI Workflow Operating System`.
- Version marker `AI Workflow OS v2.0.0` rendered in the live UI.
- Browser console errors: `0`.
- Failed network requests: `0`.
- Unexpected 4xx/5xx page asset responses: `0`.
- Live unauthenticated `POST /api/test-prompt` returned `401`, confirming provider spend is gated behind Supabase auth.

Performance spot check:

| Route | DOMContentLoaded | Load | FCP | Transferred |
| --- | ---: | ---: | ---: | ---: |
| `/` | 501 ms | 638 ms | 572 ms | 447 KB |
| `/share/product-brief` | 1183 ms | 1279 ms | 1276 ms | 220 KB |

## Command Verification

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

Result: all checks passed, audit found zero vulnerabilities.

Additional production-build browser check:

```text
consoleErrorCount=0
failedRequestCount=0
signupRequestCount=0
```

## Security Audit

Latest production scan:

- `docs/SECURITY_AUDIT_2026-05-16.md`

Summary:

- Deployed HTML and 9 generated JavaScript assets were scanned.
- No OpenAI, Vercel, or Supabase service-role secrets were found in deployed assets.
- The only deployed key-like values found were the expected public Supabase URL and publishable key.
- Security headers are present on production responses.

## External Credential Gaps

These are intentionally absent from the repository and must be configured in local `.env.local` or deployment secrets:

- Supabase URL and public keys are configured locally in ignored `.env.local`.
- `OPENAI_API_KEY` is configured in Vercel Production and Development environments, but values are encrypted/write-only.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`, and `POSTHOG_PROJECT_API_KEY` are optional production integrations and are not committed.
- Vercel Production and Development env vars are configured; Preview env vars were not present in the CLI listing and should be added before preview deployments are used.
- Supabase migrations require privileged database credentials, a Supabase access token, or a dashboard SQL run; public anon/publishable keys cannot apply schema changes.
- GitHub remote is configured; pushing depends on local GitHub authentication.
