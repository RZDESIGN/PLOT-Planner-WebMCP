# Contributing to PLOT

Thanks for helping improve PLOT. The project favors small, reviewable changes that keep human and agent behavior on the same typed action paths.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Before opening a pull request, run:

```bash
npm run check
```

This runs the domain tests, Oxlint, TypeScript and the production Vite build.

## Project conventions

- Keep database-domain validation in `src/lib/boardModel.ts`.
- Reuse the visible board actions from WebMCP handlers; do not create a hidden agent-only mutation path.
- Preserve the observe → suggest → act boundary for multi-card planning changes.
- Add or update RLS policies whenever a new Supabase table or mutation path is introduced.
- Keep migrations reproducible under `supabase/migrations/`.
- Provide a reduced-motion fallback for new animation work.
- Add focused tests for domain rules and Playwright evidence for interaction changes.

## Security

Only publishable Supabase credentials belong in frontend configuration. Never commit `.env.local`, access tokens, service-role keys or test-user sessions. Please follow [`SECURITY.md`](SECURITY.md) for vulnerability reports.
