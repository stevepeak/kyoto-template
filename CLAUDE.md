# CLAUDE.md

A Bun + Turborepo monorepo that runs entirely on Cloudflare. See
[README.md](README.md) for features, setup and deployment. Topic rules live in
`.claude/rules/` (TypeScript, React, styling, JSON parsing) and load by path.

@apps/web/AGENTS.md

## Layout

```
apps/web/          Next.js on OpenNext — UI, tRPC handler, auth, MCP + /api routes
apps/workflows/    Workers entrypoint — 007 workflows, example Workflows, queues, crons
packages/api/      tRPC routers (`protectedProcedure` narrows ctx.user)
packages/db/       Drizzle schema, D1 client, `freshDb()` test harness, migrations
packages/email/    React Email templates + render
packages/config/   zod-validated env (Worker env vs script env)
packages/wf-host/  007 host config: models, tools, triggers, run identity
packages/workflows-client/  RPC contract between the two Workers
packages/007/      git submodule (separate repo) — don't edit from here
```

## Commands

- `bun run --cwd <workspace> typecheck` after changes; fix what it reports.
- `bun run --cwd <workspace> test` — `bun test`. DB tests use `freshDb()` from
  `@app/db/testing` (in-memory, real migrations, D1 limits enforced).
- `bun run fix` — eslint --fix + prettier everywhere.
- `bun run ci` — everything CI runs, including the custom checks below.
- The user runs dev servers and services themselves; don't start them.

## Guardrails CI enforces

- **New `/api` route:** wrap it in an auth factory or list it in
  `UNWRAPPED_API_ROUTES` with the reason (`scripts/check-api-auth.ts`).
- **New Worker binding/var:** add it to that Worker's hand-written env type
  (`apps/web/cloudflare-env.d.ts`, the workflows env) —
  `scripts/check-worker-bindings.ts`.
- **New env var:** add it to `packages/config` and `.env.example`.
- No key material in tracked files or the client bundle
  (`scripts/check-security-static.ts`, gitleaks).
- Unused exports/deps fail `knip`.

## Rules

- 💋 KISS — the simplest solution. A `// TODO` is fine when scope is too large;
  product decisions stay as `TODO`s for the template's user.
- **Type-driven:** change types and schemas first, then the logic.
- **Named args:** `(args: { foo: string })` over positional `(foo: string)`.
- **Dependencies:** add shared versions to the root `package.json` workspaces
  `catalog` and reference them as `catalog:`.
- **Database:** to change the schema, edit only `packages/db/src/*.ts` (tables
  re-exported from `schema.ts`). NEVER edit `packages/db/migrations`, and never
  run `db:generate` or `db:migrate` — the user does that.
- Don't change any `tsconfig.json` without asking first and explaining why.
- Don't edit `apps/web/components/ui` (shadcn-generated, if added).
- **Status:** in development, no users. Breaking changes are fine; don't keep
  backwards compatibility except in database migrations. Update this line
  once the project ships.
