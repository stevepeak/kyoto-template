# Kyoto Template

A modern, type-safe monorepo template for building full-stack applications with Next.js, tRPC, Drizzle ORM, and Trigger.dev.

```sh
入   |
京   |
行   |   Kyoto - Vibe git template
改   |
善   |
```

## 🚀 Quick Start

### Prerequisites

- **Bun** (v1.1.42+) - [Install Bun](https://bun.sh)
- **PostgreSQL Database** - Use [Neon](https://neon.tech), [Supabase](https://supabase.com), or any PostgreSQL provider
- **Trigger.dev Account** - [Sign up](https://trigger.dev) for background job processing
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

   # Trigger.dev
   TRIGGER_PROJECT_ID="proj_xxxxx"  # Get from Trigger.dev dashboard
   TRIGGER_SECRET_KEY="tr_dev_xxxxx"  # Get from Trigger.dev dashboard

   # AI Services (choose one)
   OPENAI_API_KEY="sk-xxxxx"  # OpenAI
   # OR
   OPENROUTER_API_KEY="sk-or-v1-xxxxx"  # OpenRouter
   OPENROUTER_PROVISION_KEY="sk-or-v1-xxxxx"  # OpenRouter
   # OR
   AI_GATEWAY_API_KEY="vck_xxxxx"  # AI Gateway

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
   # Start all apps (web + trigger)
   bun run dev

   # Or start just the web app
   bun run dev:web
   ```

   - Web app: http://localhost:3000
   - Trigger.dev dev server will start automatically

## 📦 Project Structure

```
kyoto-template/
├── apps/
│   ├── web/              # Next.js 16 web application
│   │   ├── app/          # App Router pages and routes
│   │   └── ...
│   └── trigger/          # Trigger.dev background jobs
│       ├── src/tasks/    # Background task definitions
│       └── ...
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

### Trigger.dev (`apps/trigger`)

- `bun --cwd apps/trigger dev` - Start Trigger.dev dev server
- `bun --cwd apps/trigger deploy` - Deploy tasks to Trigger.dev

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
- **[Trigger.dev](https://trigger.dev)** - Background job processing
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

### Trigger.dev

Deploy background jobs:

```bash
bun --cwd apps/trigger deploy
```

### GitHub Actions Secrets

The CI workflow (`.github/workflows/ci.yml`) runs database migrations and deploys to Cloudflare on every push to `main`. Add the following secrets at **GitHub → Settings → Secrets and variables → Actions → New repository secret**:

| Secret                  | Used by             | Where to find it                                                                                                                                                                                                                                           |
| ----------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | `deploy-migrations` | Your PostgreSQL provider's dashboard. For [Neon](https://neon.tech), open the project → **Connection Details** → copy the pooled connection string. For [Supabase](https://supabase.com), open **Project Settings → Database → Connection string (URI)**.  |
| `CLOUDFLARE_API_TOKEN`  | `deploy-cloudflare` | [Cloudflare dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → use the **Edit Cloudflare Workers** template (or a custom token with `Account: Workers Scripts: Edit` + `User: User Details: Read`). |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-cloudflare` | [Cloudflare dashboard](https://dash.cloudflare.com) → select your account → **Workers & Pages** → the Account ID is shown in the right sidebar (or in the URL: `dash.cloudflare.com/<account-id>`).                                                        |

You can also add them via the GitHub CLI:

```bash
gh secret set DATABASE_URL
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)

## 📄 License

See [LICENSE](LICENSE) file for details.
