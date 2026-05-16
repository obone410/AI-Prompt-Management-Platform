# QA Report

## Local Browser QA

Target: local production server

Coverage:

- Dashboard loads on desktop and mobile viewports.
- Demo auth flow signs into the local workspace.
- Prompt test bench returns the deterministic demo AI response when no OpenAI key is configured.
- Shared prompt page renders the public prompt preview.
- Screenshots were refreshed from a production build.

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

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Vercel project/token details
- GitHub remote/authentication for pushing
