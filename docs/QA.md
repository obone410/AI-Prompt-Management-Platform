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
- AI Execution command center renders lifecycle, global search, prompt health, and top runs.
- AI Benchmarking Engine renders suites, datasets, leaderboard, heatmap, dataset-level results, regression alerts, and benchmark execution.
- Agent Builder renders agents, tool invocation logs, memory, execution canvas, and trace timeline.
- Observability Center renders unified AI runs, trace nodes, trace events, artifacts, logs, timeline replay, and performance breakdown.
- Workflow Studio renders prompt, variable, condition, and output nodes with run history and execution logs.
- Release Management renders Development, Staging, and Production lifecycle controls with rollout, health, rollback, and promotion actions.
- Analytics and Team tabs render from the production build.
- Shared prompt page renders the public prompt preview.
- Screenshots were refreshed from a production build on 2026-06-25.
- Header alignment, non-scrolling navigation, and mobile metric layout were rechecked after the frontend fit pass; mobile viewport overflow returned `0px`.
- Animated demo GIF was generated from real browser frames.
- Playwright e2e forces demo mode on its own port so tests do not depend on paid AI quota.
- v3.2 local production smoke returned homepage `200`, browser console errors `0`, failed requests `0`, mobile overflow `0px`, and unauthenticated `POST /api/test-prompt` `401`.
- v3.2 production CSP was checked locally and does not include `unsafe-eval`; Sentry, PostHog, Supabase HTTPS, and Supabase websocket endpoints are covered by `connect-src`.

Artifacts:

- `docs/screenshots/dashboard-desktop.png`
- `docs/screenshots/operations-desktop.png`
- `docs/screenshots/experiments-desktop.png`
- `docs/screenshots/workflows-desktop.png`
- `docs/screenshots/agents-desktop.png`
- `docs/screenshots/deployments-desktop.png`
- `docs/screenshots/observability-desktop.png`
- `docs/screenshots/dashboard-mobile.png`
- `docs/screenshots/shared-prompt.png`
- `docs/screenshots/live-production-security.png`
- `docs/screenshots/readme-dashboard.png`
- `docs/screenshots/readme-benchmarks.png`
- `docs/screenshots/readme-agents.png`
- `docs/screenshots/readme-observability.png`
- `docs/screenshots/readme-mobile.png`
- `docs/demos/promptops-demo.gif`

## Production Browser QA

Target: `https://ai-prompt-management-platform.vercel.app`

Result:

- Homepage returned `200`.
- Share route returned `200`.
- Production title returned `PromptDeck AI v3.2 — AI Execution OS`.
- Version marker `AI Execution OS v3.2.0` rendered in the live UI.
- Browser console errors: `0`.
- Failed network requests: `0`.
- Unexpected 4xx/5xx page asset responses: `0`.
- Live unauthenticated `POST /api/test-prompt` returned `401`, confirming provider spend is gated behind Supabase auth.
- Demo sign-in rendered `Demo session` and did not create a Supabase account.
- Operations, Benchmarks, Agents, Workflows, Releases, Observability, Analytics, and Team views opened on production.

Performance spot check from the 2026-06-25 recheck:

| Route | DOMContentLoaded | Load | FCP | Transferred |
| --- | ---: | ---: | ---: | ---: |
| `/` local production | 200 status | console errors `0` | mobile overflow `0px` | CSP `unsafe-eval=false` |
| `/api/test-prompt` unauthenticated | 401 status | provider spend gated | rate limited | Zod validated |

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

- `docs/SECURITY_AUDIT_2026-06-25.md`

Summary:

- Source, dependency, local production headers, and generated media assets were rechecked.
- No OpenAI, Vercel, or Supabase service-role secrets were found in deployed assets.
- The only deployed key-like values found were the expected public Supabase URL and publishable key.
- Security headers are present and v3.2 removes production `unsafe-eval` from CSP.

## External Credential Gaps

These are intentionally absent from the repository and must be configured in local `.env.local` or deployment secrets:

- Supabase URL and public keys are configured locally in ignored `.env.local`.
- `OPENAI_API_KEY` is configured in Vercel Production and Development environments, but values are encrypted/write-only.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`, and `POSTHOG_PROJECT_API_KEY` are optional production integrations and are not committed.
- Vercel Production and Development env vars are configured; Preview env vars were not present in the CLI listing and should be added before preview deployments are used.
- Supabase migrations are applied to project `gujupmdzuonefgliqrdu`, including the v3.1 `unified_execution_observability` migration; future schema changes still require privileged Supabase management access because public anon/publishable keys cannot apply DDL.
- GitHub remote is configured; pushing depends on local GitHub authentication.
