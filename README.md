# Template Repo

A type-safe monorepo template that runs entirely on Cloudflare:
Next.js (OpenNext) + tRPC + Drizzle over D1, better-auth (Google + passkeys),
the [007](https://github.com/stevepeak/007) AI-workflow SDK, React Email, and
two MCP servers behind OAuth.

> **This is a template.** Product, legal and infrastructure decisions are left
> as `TODO` comments (and visible `[TODO: …]` placeholders in the legal pages).
> Run `git grep -n TODO -- ':!packages/007'` and work through
> [Decisions for you](#decisions-for-you) before shipping.

## What's included

| Feature                                                                                                                                                                                                                                     | Where                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Cloudflare everything** — two Workers (web + workflows), D1, R2, Vectorize, Workers AI, Email Sending, Workflows, Durable Objects, Queues                                                                                                 | `apps/*/wrangler.jsonc`                                                                                           |
| **Document search** — 007's `extract_text` → `index_document` (chunk, embed with Workers AI BGE-M3, upsert to Vectorize, one namespace per run scope) and the `search_documents` agent tool                                                 | `packages/wf-host/src/tools/documents.ts`                                                                         |
| **D1 + Drizzle** — `createDb(env.DB)`; in-memory `freshDb()` for tests that replays real migrations and enforces D1 limits                                                                                                                  | `packages/db`                                                                                                     |
| **User accounts** — better-auth, per-request on D1; email/password, **Google** (shown only when configured), **passkeys**; `/login`                                                                                                         | `apps/web/lib/auth.ts`                                                                                            |
| **Auth hardening** — required email verification, forgot/reset password, active-session list with sign-out, D1-backed rate limits, optional **Turnstile** on sign-up/sign-in/reset                                                          | `apps/web/lib/auth.ts`, `app/(site)/*-password`, `settings/security`                                              |
| **Production basics** — Sentry (browser + both Workers), CSP/HSTS/security headers, `/api/health`, `robots.txt` + sitemap + generated OG image, per-category email opt-outs with one-click unsubscribe, PR preview deploys on a staging env | `apps/web/worker.ts`, `security-headers.js`, `lib/health.ts`, `app/robots.ts`, `settings/notifications`, `ci.yml` |
| **007** — workflow authoring console at `/workflows`, durable runs in the workflows Worker, its own D1 (`WF_DB`)                                                                                                                            | `packages/007` (submodule), `packages/wf-host`                                                                    |
| **MCP** — app MCP at `/api/mcp` (`whoami`), 007 MCP at `/api/wf/mcp[/write]`; OAuth 2.1 via better-auth `mcp()` with dynamic client registration and a consent screen                                                                       | `apps/web/lib/app-mcp.ts`, `lib/wf-mcp.ts`                                                                        |
| **React Email** — templates + render to `{subject, html, text}`, sent through the Cloudflare `EMAIL` binding (logged in dev)                                                                                                                | `packages/email`, `apps/web/lib/email.ts`                                                                         |
| **Billing** — Stripe via better-auth's plugin: 3-tier `/pricing` with a popular tag, Checkout, billing portal, webhook-synced subscriptions, Settings → Billing with past invoices and a per-invoice view; Stripe sends receipts            | `apps/web/lib/billing`, `components/billing`                                                                      |
| **Legal pages** — `/privacy` and `/terms` templates with a "Draft" banner until finalised                                                                                                                                                   | `apps/web/lib/legal`                                                                                              |

## Quick start

Prerequisites: [Bun](https://bun.sh) 1.4+, a Cloudflare account (Workers Paid
for Workflows + Durable Objects).

```bash
git clone --recurse-submodules <your-repo-url>   # or: git submodule update --init --recursive
bun install
cp .env.example .env              # fill BETTER_AUTH_SECRET at minimum
cp .wf-migrate.env.example .wf-migrate.env
bun run db:migrate:local          # app D1 + 007's D1, in ./.wrangler/state
```

Then start the apps (or `tilt up`):

```bash
bun run --cwd apps/workflows dev  # :8787
bun run --cwd apps/web dev        # :3000
bun run --cwd packages/email dev  # :3002 email previews
```

`next dev` gets real bindings (D1, service binding, email) through
`initOpenNextCloudflareForDev`, persisting to the same `.wrangler/state` as the
workflows worker and the migrations.

### Connecting an MCP client

`.mcp.json` registers the **007** MCP for this repo
(`http://localhost:3000/api/wf/mcp/write`). The first call opens a browser to
sign in and approve. The app MCP is at `/api/mcp`:

```bash
claude mcp add --transport http app http://localhost:3000/api/mcp
```

## Scripts

| Command                                     | What it does                                                |
| ------------------------------------------- | ----------------------------------------------------------- |
| `bun run ci`                                | typecheck → lint → test → 007 lockfile check → knip → build |
| `bun run fix`                               | eslint --fix + prettier across workspaces                   |
| `bun run db:migrate:local` / `db:migrate`   | apply app + 007 D1 migrations locally / remotely            |
| `bun run --cwd packages/db db:generate`     | generate a migration from `src/schema.ts`                   |
| `bun run --cwd packages/db db:studio:local` | Drizzle Studio on the local D1                              |
| `bun-update --all`                          | update every workspace's dependencies (see note below)      |

The 007 submodule is linted/typechecked/tested in its own repo, so turbo tasks
filter it out (`--filter=!@stevepeak/007`). `check:007-lockfile` fails when its
standalone `bun.lock` drifts — fix with `bun run --cwd packages/007 lock`.

**Pinned:** `@cloudflare/workers-types` is held at `5.20261112.1`;
`5.20261114.1` breaks `DurableObjectNamespace<RunRoom>` assignability against 007. `typescript` is aliased to `@typescript/typescript6` (TS 7 has no JS API,
which Next, typescript-eslint and scripts need); TS 7 is available as
`@typescript/native`.

## Layout

```
apps/
  web/          Next.js on OpenNext — UI, tRPC, auth, /api/wf, MCP routes
  workflows/    Workers entrypoint — 007 GraphWorkflow/EvalSweepWorkflow/RunRoom,
                example Workflows, queues, crons
packages/
  007/          @stevepeak/007 (git submodule)
  wf-host/      007 host config: model provider, tools, triggers, run identity
  api/          tRPC routers (ctx: db, user, workflows; protectedProcedure)
  db/           Drizzle schema + D1 client + test harness + migrations
  email/        React Email templates + render
  config/       zod-validated env
  workflows-client/  RPC contract between the two Workers
  agents/ posthog/ utils/
config/         shared eslint (react/server presets) + tsconfig
```

## Deployment

CI (`.github/workflows/ci.yml`) runs every check on PRs; on `main` it applies
D1 migrations, deploys the workflows Worker, then builds and deploys the web
Worker. Required repo secrets: `CLOUDFLARE_API_TOKEN` (D1:Edit + Workers
Scripts:Edit), `CLOUDFLARE_ACCOUNT_ID`, `APP_URL`. Optional: `NEXT_PUBLIC_SENTRY_DSN`,
`SENTRY_AUTH_TOKEN` (+ variables `SENTRY_ORG`, `SENTRY_PROJECT`) for Sentry
with source maps.

**PR previews** (opt-in): with repo variables `PREVIEW_DEPLOYS=true` and
`CF_WORKERS_SUBDOMAIN`, each same-repo PR uploads a web version with alias
`pr-<n>` to the staging Worker (`env.staging` in each wrangler file — its own
D1s, buckets, Vectorize index and queues) and comments the URL. Previews share the staging data
and workflows Worker, and are never indexed. `/setup preview` creates the
staging resources.

Worker secrets (`wrangler secret put …` in each app):
`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `TURNSTILE_SECRET_KEY`, `OPENROUTER_API_KEY`,
`WF_CONNECTOR_KEY` (same value on both Workers), `TOKEN_SIGNING_KEY` (workflows),
`SENTRY_DSN` (both Workers), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (web,
optional — billing is off without them).

The web Worker's entry is `apps/web/worker.ts` — OpenNext's generated handler
wrapped with Sentry — so `wrangler` needs a `build:cloudflare` first.

## Decisions for you

Everything below is a `TODO` in code. Nothing here was decided for you.

- **Cloudflare:** Worker names, D1 database names + ids (×3 wrangler files),
  R2 bucket and Vectorize index names (`/setup` creates them),
  custom domain, account id, production `vars`.
- **Auth:** open sign-up? email/password on? may Google create accounts?
  account linking, OTP / magic link, reset- and verification-link lifetimes,
  rate-limit budget, which routes require sign-in (`proxy.ts`). Email
  verification is **required** for email/password sign-ups
  (`requireEmailVerification`). Turnstile is on only when
  `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` are set.
- **Email:** sending domain/sender (`EMAIL_FROM` + `allowed_sender_addresses`),
  brand colours, footer, template copy, whether to send the welcome email.
- **Legal:** every `[TODO]` in `/privacy` and `/terms` — have counsel review.
- **Billing:** plans, prices and limits (`lib/billing/plans.ts`, then
  `bun run --cwd apps/web stripe:sync`); free tier or none (`planLimits`);
  annual pricing, trials, Stripe Tax (`getCheckoutSessionParams`); which
  Stripe customer emails to turn on. `/setup billing` walks through it.
- **007:** who may use `/workflows` (`lib/wf-access.ts`; currently a
  `WF_ADMIN_EMAILS` allowlist, open to any signed-in user only in dev),
  models/provider, tools, triggers, run-scope identity, telemetry; whether to
  keep the hand-written example Workflows now that 007 exists.
- **MCP:** app scope name + consent copy, server instructions, the app's tools.
- **Brand:** product name and description (`apps/web/lib/brand.ts`,
  `packages/email/src/brand.ts`), the social image (`app/opengraph-image.tsx`).
- **Observability:** Sentry trace sample rates (10%), Session Replay on errors
  (privacy policy!), whether PostHog is required, an uptime monitor on
  `/api/health`.
- **Security headers:** the CSP allows inline scripts (Next hydration);
  switch to nonces for a strict policy. HSTS has no `includeSubDomains` yet.
- **Notifications:** the optional email categories (`NOTIFICATION_CATEGORIES`
  in `packages/api`); send product mail with `sendNotificationEmail` so it
  honours opt-outs and carries `List-Unsubscribe`.
- **Strictness:** `noUncheckedIndexedAccess` in `config/tsconfig/bun.json`.

## License

MIT — see [LICENSE](LICENSE).
