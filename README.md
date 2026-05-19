# Template Repo

A modern, type-safe monorepo template for building full-stack applications with Next.js, tRPC, Drizzle ORM, and a Cloudflare-native background-job stack (Workflows + Queues + Durable Objects).

## 🚀 Quick Start

### Prerequisites

- **Bun** (v1.1.42+) - [Install Bun](https://bun.sh)
- **PostgreSQL Database** - Use [Neon](https://neon.tech), [Supabase](https://supabase.com), or any PostgreSQL provider
- **Cloudflare Account** - [Sign up](https://dash.cloudflare.com/sign-up) — Workers Paid plan is required for Workflows + Durable Objects
- **Sentry Account** - [Sign up](https://sentry.io) for error tracking
- **PostHog Account** - [Sign up](https://posthog.com) for analytics (optional)

### Using This Template

1. **Create a new repository from this template:**

   ```bash
   # Use GitHub's "Use this template" button, or:
   gh repo create my-app --template stevepeak/kyoto-template
   ```

2. **Clone your new repository:**

   ```bash
   git clone <your-repo-url>
   cd my-app
   ```

3. **Install dependencies:**

   ```bash
   bun install
   ```

4. **Set up environment variables:**
   Create a `.env` file in the root directory:

   ```bash
   # App Configuration
   APP_URL="http://localhost:3000"

   # Database (PostgreSQL)
   DATABASE_URL="postgresql://user:password@host:5432/database"

   # Better Auth
   BETTER_AUTH_SECRET="your-secret-here"  # Generate with: openssl rand -base64 32

   # Cloudflare Workflows worker (replaces Trigger.dev)
   TOKEN_SIGNING_KEY="..."          # Generate with: openssl rand -base64 32
   WORKFLOWS_URL="http://localhost:8787"
   NEXT_PUBLIC_WORKFLOWS_URL="http://localhost:8787"

   # AI — routed through OpenRouter
   OPENROUTER_API_KEY="sk-or-v1-xxxxx"

   # Sentry (Error Tracking)
   SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"

   # PostHog (Analytics - optional)
   POSTHOG_API_KEY="ph_xxxxx"
   POSTHOG_HOST="https://us.i.posthog.com"
   ```

5. **Set up the database:**

   ```bash
   # Generate migration files from schema
   bun --cwd packages/db db:generate

   # Apply migrations to database
   bun --cwd packages/db db:migrate

   # Or push schema directly (for development)
   bun --cwd packages/db db:push
   ```

6. **Start development servers:**

   ```bash
   # Start all apps (web + workflows worker)
   bun run dev

   # Or start just the web app
   bun run dev:web
   ```

   - Web app: http://localhost:3000
   - Workflows worker: http://localhost:8787 (Wrangler dev with local
     Workflows / Queues / Durable Object simulation, persisted to
     `.wrangler/state`)

## 📦 Project Structure

```
kyoto-template/
├── apps/
│   ├── web/              # Next.js 16 web application
│   │   ├── app/          # App Router pages and routes
│   │   └── ...
│   └── workflows/        # Cloudflare Workflows / Queues / DOs worker
│       └── src/
│           ├── workflows/        # WorkflowEntrypoint classes
│           ├── durable-objects/  # Per-run progress / WebSocket fan-out
│           └── queues/           # Queue consumers
│
├── packages/
│   ├── api/              # tRPC API definitions
│   │   └── src/
│   │       ├── index.ts  # Main router export
│   │       └── trpc.ts   # tRPC setup
│   │
│   ├── db/               # Drizzle ORM database package
│   │   ├── src/
│   │   │   ├── schema.ts # Database schema definitions
│   │   │   └── migrate.ts # Migration runner
│   │   └── migrations/   # Generated migration files
│   │
│   ├── config/           # Environment variable validation
│   │   └── src/index.ts  # Zod-validated config
│   │
│   ├── agents/           # AI agent tooling and MCP integration
│   ├── utils/            # Shared utilities
│   └── posthog/          # PostHog analytics helpers
│
└── config/               # Shared configuration
    ├── eslint/           # ESLint config
    └── tsconfig/         # TypeScript configs
```

## 🛠 Available Scripts

### Root Level

- `bun run dev` - Start all development servers
- `bun run dev:web` - Start only the web app
- `bun run build` - Build all packages and apps
- `bun run typecheck` - Type check all packages
- `bun run lint` - Lint all packages
- `bun run fix` - Auto-fix linting issues
- `bun run ci` - Run CI checks (typecheck + lint + knip + build)
- `bun run clean` - Clean all build artifacts

### Database (`packages/db`)

- `bun --cwd packages/db db:generate` - Generate migration files
- `bun --cwd packages/db db:migrate` - Run migrations
- `bun --cwd packages/db db:push` - Push schema directly (dev only)
- `bun --cwd packages/db db:studio` - Open Drizzle Studio

### Workflows worker (`apps/workflows`)

- `bun --cwd apps/workflows dev` - Start Wrangler dev with Workflows / Queues / DOs
- `bun --cwd apps/workflows dev:scheduled` - Same, plus the `/__scheduled` endpoint for manual cron firing
- `bun --cwd apps/workflows deploy` - Deploy the worker (Workflows + DOs + Queues + Cron triggers)
- `bun --cwd apps/workflows tail` - Stream production logs

Trigger a cron run locally:

```bash
curl 'http://localhost:8787/__scheduled?cron=0+3+*+*+*'
```

## 🏗 Tech Stack

### Core

- **[Bun](https://bun.sh)** - Fast JavaScript runtime and package manager
- **[Turborepo](https://turbo.build)** - High-performance monorepo build system
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe JavaScript

### Frontend

- **[Next.js 16](https://nextjs.org)** - React framework with App Router
- **[React 19](https://react.dev)** - UI library
- **[Tailwind CSS v4](https://tailwindcss.com)** - Utility-first CSS
- **[tRPC](https://trpc.io)** - End-to-end typesafe APIs

### Backend

- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe SQL ORM
- **[PostgreSQL](https://www.postgresql.org)** - Database
- **[Cloudflare Workflows](https://developers.cloudflare.com/workflows/)** - Durable, resumable async tasks (replaces Trigger.dev)
- **[Cloudflare Queues](https://developers.cloudflare.com/queues/)** - Batched fire-and-forget jobs with retries + DLQ
- **[Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)** - Per-run progress fan-out via WebSocket / SSE
- **[Zod](https://zod.dev)** - Schema validation

### Infrastructure

- **[Sentry](https://sentry.io)** - Error tracking and monitoring
- **[PostHog](https://posthog.com)** - Product analytics
- **[Vercel](https://vercel.com)** - Deployment (configured in `vercel.json`)

## 📚 Key Packages

### `@app/config`

Centralized environment variable parsing and validation with Zod. Provides type-safe access to all environment variables across the monorepo.

```typescript
import { getConfig } from '@app/config'
const { APP_URL, DATABASE_URL } = getConfig()
```

### `@app/api`

Server-side tRPC API definitions. Contains all API routers and procedures with end-to-end type safety.

### `@app/db`

Drizzle ORM database package. Contains schema definitions, migrations, and database connection logic.

```typescript
import { db } from '@app/db'
import { schema } from '@app/db/schema'
```

### `@app/agents`

AI agent tooling and MCP (Model Context Protocol) integration for orchestrating specialized agents.

### `@app/utils`

Shared JavaScript utilities and helper functions.

## 🔧 Development Guidelines

### Type-Driven Development

Adjust types and schemas first before implementing logic. Run typecheck after changes:

```bash
bun run typecheck
```

### Named Arguments

Use named arguments instead of inline arguments:

```typescript
// ✅ Good
function greet(args: { name: string }) {}

// ❌ Avoid
function greet(name: string) {}
```

### Database Migrations

- **NEVER** edit files in `packages/db/migrations`
- **ONLY** edit `packages/db/src/schema.ts` to make schema changes
- Use `db:generate` to create migrations and `db:migrate` to apply them

### Code Quality

- Uses ESLint and Prettier for code formatting
- Uses Knip for detecting unused code
- Pre-commit hooks with Husky and lint-staged

## 🚢 Deployment

### Vercel

The project is configured for Vercel deployment. Set all environment variables in the Vercel dashboard.

### Workflows worker

Deploy the workflows Worker (Workflows + Durable Objects + Queues + Cron triggers in one shot):

```bash
bun --cwd apps/workflows deploy
```

Set runtime secrets once:

```bash
bunx wrangler --cwd apps/workflows secret put TOKEN_SIGNING_KEY
bunx wrangler --cwd apps/workflows secret put OPENROUTER_API_KEY
bunx wrangler --cwd apps/workflows secret put SENTRY_DSN
```

### GitHub Actions Secrets

The CI workflow (`.github/workflows/ci.yml`) runs database migrations and deploys to Cloudflare on every push to `main`. Add the following secrets at **GitHub → Settings → Secrets and variables → Actions → New repository secret**:

| Secret                        | Used by             | Where to find it                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                | `deploy-migrations` | Your PostgreSQL provider's dashboard. For [Neon](https://neon.tech), open the project → **Connection Details** → copy the pooled connection string. For [Supabase](https://supabase.com), open **Project Settings → Database → Connection string (URI)**.  |
| `CLOUDFLARE_API_TOKEN`        | `deploy-cloudflare` | [Cloudflare dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → use the **Edit Cloudflare Workers** template (or a custom token with `Account: Workers Scripts: Edit` + `User: User Details: Read`). |
| `CLOUDFLARE_ACCOUNT_ID`       | `deploy-cloudflare` | [Cloudflare dashboard](https://dash.cloudflare.com) → select your account → **Workers & Pages** → the Account ID is shown in the right sidebar (or in the URL: `dash.cloudflare.com/<account-id>`).                                                        |
| `NEXT_PUBLIC_APP_URL`         | `deploy-cloudflare` | Public URL of the deployed app (e.g. `https://kyoto-web.example.workers.dev`). Inlined into the client bundle at build time.                                                                                                                               |
| `NEXT_PUBLIC_POSTHOG_API_KEY` | `deploy-cloudflare` | [PostHog](https://posthog.com) → **Project Settings → Project API Key**. Inlined into the client bundle at build time so the browser SDK can initialize.                                                                                                   |
| `NEXT_PUBLIC_POSTHOG_HOST`    | `deploy-cloudflare` | `https://us.i.posthog.com` (US cloud) or `https://eu.i.posthog.com` (EU). Inlined at build time.                                                                                                                                                           |
| `NEXT_PUBLIC_SENTRY_DSN`      | `deploy-cloudflare` | [Sentry](https://sentry.io) → **Project Settings → Client Keys (DSN)**. Inlined at build time.                                                                                                                                                             |

You can also add them via the GitHub CLI:

```bash
gh secret set DATABASE_URL
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set NEXT_PUBLIC_APP_URL
gh secret set NEXT_PUBLIC_POSTHOG_API_KEY
gh secret set NEXT_PUBLIC_POSTHOG_HOST
gh secret set NEXT_PUBLIC_SENTRY_DSN
```

### Cloudflare Worker runtime secrets

Server-side secrets (the ones without a `NEXT_PUBLIC_` prefix — `POSTHOG_API_KEY`, `SENTRY_DSN`, `OPENROUTER_API_KEY`, `BETTER_AUTH_SECRET`, etc.) are read by the Worker at runtime, not inlined at build. Set them once with Wrangler from `apps/web`:

```bash
bunx wrangler secret put POSTHOG_API_KEY
bunx wrangler secret put POSTHOG_HOST
bunx wrangler secret put SENTRY_DSN
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put DATABASE_URL
# ...repeat for any other required secret in packages/config/src/index.ts
```

The CI deploy uses `wrangler deploy --keep-vars` so these secrets persist across deployments.

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Cloudflare Workflows Documentation](https://developers.cloudflare.com/workflows/)
- [Cloudflare Queues Documentation](https://developers.cloudflare.com/queues/)
- [Cloudflare Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Turborepo Documentation](https://turbo.build/repo/docs)

## 📄 License

See [LICENSE](LICENSE) file for details.
