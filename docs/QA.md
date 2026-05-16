# QA Report

## Local Browser QA

Target: local production server

Coverage:

- Dashboard loads on desktop and mobile viewports.
- Supabase public project configuration loads in the production build.
- Demo auth flow signs into the local workspace.
- Prompt test bench returns the deterministic demo AI response when no OpenAI key is configured.
- Shared prompt page renders the public prompt preview.
- Screenshots were refreshed from a production build.
- Playwright e2e forces demo mode on its own port so tests do not depend on paid AI quota.

Artifacts:

- `docs/screenshots/dashboard-desktop.png`
- `docs/screenshots/dashboard-mobile.png`
- `docs/screenshots/shared-prompt.png`

## Command Verification

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

Result: all checks passed, audit found zero vulnerabilities.

## External Credential Gaps

These are intentionally absent from the repository and must be configured in local `.env.local` or deployment secrets:

- Supabase URL and public keys are configured locally in ignored `.env.local`.
- `OPENAI_API_KEY` is configured locally, but the provider returned a quota/billing 429 during live route validation.
- Supabase migrations still require privileged database credentials, a Supabase access token, or a dashboard SQL run; public anon/publishable keys cannot apply schema changes.
- Vercel team ID is configured locally, but no Vercel token or linked project is present.
- GitHub remote is configured; push still depends on local GitHub authentication.
