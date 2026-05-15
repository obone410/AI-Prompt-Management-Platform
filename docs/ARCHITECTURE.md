# PromptDeck AI Architecture

## Product Surface

PromptDeck AI is a prompt management workspace for saving, categorizing, testing, sharing, favoriting, searching, and exporting reusable prompts. The first screen is the working console so recruiters can immediately test CRUD and AI workflow behavior.

## Stack

- Next.js 16 App Router with React 19
- Tailwind CSS 4
- Supabase Auth and Postgres with RLS-ready migrations
- OpenAI Responses API through a server-only route
- Vercel-ready environment variables

## Data Model

- `profiles`: one profile per Supabase auth user
- `prompt_categories`: user-owned categories with color and description
- `prompts`: user-owned prompt records with tags, sharing, favorite state, search vector, and AI settings
- `prompt_runs`: test history with provider, latency, model, input, and output

## Scale Notes For 1 Million Users

- User-scoped composite indexes keep dashboard queries bounded by `user_id`.
- Full-text search uses a generated `tsvector` with a GIN index instead of scanning prompt bodies.
- Tags use a GIN index for filter performance.
- Public sharing uses a partial unique index on `share_slug`.
- Prompt runs are append-only and indexed by user and prompt for recent-history reads.
- The app is ready for cursor pagination once workspaces grow beyond the first page of prompts.
- AI test calls stay on the server so provider keys and future rate limits are centralized.

## Local Mode

When Supabase or OpenAI keys are absent, the app runs with seeded local data and a deterministic demo AI response. When Supabase is configured, a signed-in workspace is seeded into Postgres on first use and subsequent prompt/category/run changes are persisted through RLS-protected tables.
