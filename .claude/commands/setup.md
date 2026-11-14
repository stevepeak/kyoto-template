---
description: Guided setup of this template on Cloudflare — names, D1/R2/Queues, secrets, email, Turnstile, Sentry, previews, CI
argument-hint: '[phase name to jump to, e.g. "turnstile"]'
---

Walk the user through turning this template into their deployed project on
Cloudflare. Do the Cloudflare work yourself where you can; guide them through
what only they can do (DNS ownership, Google Cloud, billing).

If `$ARGUMENTS` names a phase, start there. Otherwise run every phase in order.

## Ground rules

- **Check before you create.** Every phase is re-runnable: list what already
  exists (resources, ids in wrangler files, secrets) and only create what is
  missing. Never replace a real id with a new resource.
- **Ask before anything outward-facing or hard to undo** — creating paid
  resources, applying remote migrations, deploying, setting GitHub secrets.
  Batch questions per phase rather than one at a time.
- **Never print secret values.** Generate them with `openssl rand -base64 32`
  and pipe straight into `wrangler secret put` / `gh secret set`; write local
  copies only into `.env` (gitignored).
- **Don't start dev servers or deploy unless asked** — the user runs services
  themselves.
- Keep a running list of what was done, skipped, and left for the user; print it
  at the end.

## Tools

Prefer the **`cloudflare` MCP** (`.mcp.json` → `https://mcp.cloudflare.com/mcp`,
Code Mode: `search()` to find an API endpoint, `execute()` to call it). It
covers the whole Cloudflare API, including Turnstile and Email Sending, which
wrangler doesn't. The first call opens a browser for OAuth.

The **`sentry` MCP** (`https://mcp.sentry.dev/mcp`) can find or create the
Sentry org/project and read its DSN for the Sentry phase.

Fall back to wrangler. It does NOT read `.env` on its own:

```bash
set -a && source .env && set +a && bunx wrangler <command>
```

## Phases

### 1. Preflight

- `bun --version` (1.4+), submodule present (`packages/007/package.json`;
  else `git submodule update --init --recursive`), `bun install` done.
- `.env` exists (else copy `.env.example`); `.wf-migrate.env` exists (else copy
  its `.example`).
- Cloudflare access works: MCP `execute` → list accounts, or
  `wrangler whoami`. Record the account id in `.env` `CLOUDFLARE_ACCOUNT_ID`.
- The account is on **Workers Paid** — Workflows and Durable Objects need it.
  If not, stop and tell the user.

### 2. Naming

Ask for: product name, a short resource prefix (replaces `template`), and the
production hostname (e.g. `app.example.com`). Then update, keeping each pair
in sync:

- `PRODUCT_NAME` in `apps/web/lib/brand.ts` and `packages/email/src/brand.ts`;
  ask for a one-line `PRODUCT_DESCRIPTION` too (`apps/web/lib/brand.ts`).
- Worker names: `apps/web/wrangler.jsonc` `name`, `apps/workflows/wrangler.jsonc`
  `name`, and web's `services[].service` (must equal the workflows name).
- D1 `database_name` in all three wrangler files (`apps/web`, `apps/workflows`,
  `packages/db`) plus the `db:migrate*` scripts in `packages/db/package.json`;
  R2 bucket name (web); queue + DLQ names (workflows). Rename the `-staging`
  twins in each file's `env.staging` block the same way, and the staging
  Worker names in `.github/workflows/ci.yml` (`preview` job URLs).

### 3. Resources

Create what's missing, then paste ids back:

- **D1 ×2** — app DB and 007's WF DB. Ask for a location hint / jurisdiction
  first. Put each id into every wrangler file that binds it (app DB: all three;
  WF DB: web + workflows) and the app DB id into `.env` `D1_DATABASE_ID`.
- **R2** — the avatars bucket.
- **Queues** — the notifications queue and its dead-letter queue.
- Workflows and Durable Objects are created by the first deploy — nothing to do.

### 4. Migrations

The repo rules forbid agents running `db:migrate`, so hand this one over: show
the pending list (`wrangler d1 migrations list <db> --remote`), then ask the
user to run `! bun run db:migrate` (app D1 + 007's D1, remote). CI also applies
migrations on every push to `main`.

### 5. Secrets

Workers must exist before `wrangler secret put` targets them; if they don't,
wrangler offers to create a draft — accept, or do this phase after the first
deploy.

| Secret               | Worker(s)                         | Source                  |
| -------------------- | --------------------------------- | ----------------------- |
| `BETTER_AUTH_SECRET` | web                               | generate                |
| `TOKEN_SIGNING_KEY`  | workflows                         | generate                |
| `WF_CONNECTOR_KEY`   | web **and** workflows, same value | generate (optional)     |
| `OPENROUTER_API_KEY` | web, workflows                    | ask the user (optional) |
| `POSTHOG_API_KEY`    | web                               | ask the user (optional) |
| `SENTRY_DSN`         | web **and** workflows             | Sentry phase            |

Check `wrangler secret list` first; don't overwrite an existing secret without
asking.

### 6. Domain & URLs

- Confirm the hostname's zone is on this Cloudflare account (MCP: list zones).
  If not, explain they must add it (nameserver change) — their call.
- Add `"routes": [{ "pattern": "<host>", "custom_domain": true }]` to the web
  wrangler file; set `APP_URL` in its `vars`. Set the workflows Worker's
  `PUBLIC_BASE_URL` (its own route or `*.workers.dev` URL).

### 7. Email Sending

Required: sign-ups need the verification email.

- Onboard a sending domain/subdomain to Cloudflare Email Sending (MCP; or guide
  them through the dashboard if the API isn't available).
- Set `EMAIL_FROM` / `EMAIL_FROM_NAME` in web `vars`, and the same address in
  `send_email[].allowed_sender_addresses` in BOTH Worker configs.

### 8. Turnstile

- Create a Managed widget for the production hostname (+ `localhost` if they
  want real checks in dev) via the API (`/accounts/{id}/challenges/widgets`).
- Site key → `TURNSTILE_SITE_KEY` in web `vars`; secret →
  `wrangler secret put TURNSTILE_SECRET_KEY` (web).
- Local: offer Cloudflare's always-pass test keys from `.env.example`.

### 9. Sentry

Recommended before launch — otherwise production errors only reach Workers
logs.

- With the `sentry` MCP: find or create a project (platform: Next.js) and read
  its DSN. Without it, have the user create one and paste the DSN.
- `wrangler secret put SENTRY_DSN` on **both** Workers (same DSN is fine; use a
  second project if they want the workflows Worker separate).
- The browser DSN is build-time: GitHub secret `NEXT_PUBLIC_SENTRY_DSN`.
- Readable stack traces: create an org auth token (scope `project:releases`) →
  GitHub secret `SENTRY_AUTH_TOKEN`, plus GitHub _variables_ `SENTRY_ORG` and
  `SENTRY_PROJECT`.
- Remind them Session Replay records around errors
  (`apps/web/instrumentation-client.ts`) — their privacy policy should say so.

### 10. Uptime monitoring

`GET /api/health` returns 200 when D1 and the workflows Worker answer, 503
otherwise. Point a monitor at `https://<host>/api/health`: Cloudflare Health
Checks (Pro plan and up, via the MCP) or any external uptime service — ask
which. Nothing to configure in the repo.

### 11. PR previews (optional)

Each same-repo PR gets its own URL, backed by a separate **staging** Worker
pair and staging D1s/bucket/queues (`env.staging` in all three wrangler files,
`preview` job in `.github/workflows/ci.yml`). Ask whether they want it; if so:

- Create `<prefix>-db-staging`, `<prefix>-wf-staging`, the
  `<prefix>-avatars-staging` bucket and the staging queue + DLQ; paste the ids
  into each `env.staging` block.
- Look up the account's workers.dev subdomain (MCP:
  `/accounts/{id}/workers/subdomain`); set `PUBLIC_BASE_URL` in the workflows
  `env.staging` vars to `https://<prefix>-workflows-staging.<subdomain>.workers.dev`.
- Secrets on the staging Workers (`--env staging`): fresh
  `BETTER_AUTH_SECRET` (web) and `TOKEN_SIGNING_KEY` (workflows); `SENTRY_DSN`
  on both if set up.
- GitHub _variables_ `PREVIEW_DEPLOYS=true` and `CF_WORKERS_SUBDOMAIN`.
- Tell them: previews share the staging DBs and workflows Worker (last PR
  wins), use email/password only (Google and passkeys are tied to the
  production domain), and never index (`NOINDEX`).

### 12. Optional features (ask which)

- **Google sign-in** — guide them: Google Cloud → OAuth client, redirect URI
  `https://<host>/api/auth/callback/google`; `GOOGLE_CLIENT_ID` in vars,
  `GOOGLE_CLIENT_SECRET` as a secret.
- **Workflow admins** — `WF_ADMIN_EMAILS` (comma-separated) in web vars.
- **PostHog** — `NEXT_PUBLIC_POSTHOG_API_KEY` is build-time: GitHub secret.

### 13. CI

If a GitHub remote exists, ask, then `gh secret set` for
`CLOUDFLARE_API_TOKEN` (needs D1:Edit + Workers Scripts:Edit — check the
token's permissions via the API first), `CLOUDFLARE_ACCOUNT_ID`, `APP_URL`, and
any `NEXT_PUBLIC_*` / `SENTRY_*` values chosen above (`gh variable set` for
`SENTRY_ORG`, `SENTRY_PROJECT`, `PREVIEW_DEPLOYS`, `CF_WORKERS_SUBDOMAIN`).

### 14. Wrap-up

- Run `bun run typecheck` to confirm the edited configs still check.
- `git grep -n TODO -- ':!packages/007'` — list the remaining owner decisions
  (legal pages, copy) that no tool can make.
- Print the done / skipped / left-for-you list. Point them at the setup
  checklist (`/setup`) on the deployed app, which reports what that
  deployment can actually see.
