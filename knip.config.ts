import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  // The 007 submodule is linted, typechecked and tested in its own repo.
  ignoreWorkspaces: ['packages/007'],
  workspaces: {
    '.': {
      entry: ['scripts/*.ts'],
      // Editor-tooling shim that re-exports apps/web's Tailwind config.
      ignore: ['tailwind.config.js'],
    },
    'apps/web': {
      entry: ['app/**/*.{ts,tsx}', 'open-next.config.ts', 'scripts/*.ts'],
      project: ['**/*.{ts,tsx}'],
      // Loaded via `@plugin` in globals.css, which knip doesn't follow.
      ignoreDependencies: ['@tailwindcss/typography'],
    },
    'apps/workflows': {
      project: ['src/**/*.ts'],
      // TODO: wire Sentry (instrumentWorkflowWithSentry / withSentry) or drop it.
      ignoreDependencies: ['@sentry/cloudflare'],
    },
    'packages/db': {
      entry: ['drizzle.config.local.ts'],
    },
    'packages/email': {
      // `email dev` previews every file under src/templates.
      entry: ['src/templates/*.tsx'],
    },
  },
}

export default config
