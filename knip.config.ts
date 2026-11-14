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
      entry: [
        'app/**/*.{ts,tsx}',
        // Typed PostHog flags for server code — template API, no caller yet.
        'lib/server-feature-flags.ts',
        'open-next.config.ts',
        'scripts/*.ts',
        // Product-email sender: no caller until the first optional email.
        'lib/notification-email.ts',
      ],
      project: ['**/*.{ts,tsx}'],
      // Loaded via `@plugin` in globals.css, which knip doesn't follow.
      ignoreDependencies: ['@tailwindcss/typography'],
    },
    'apps/workflows': {
      project: ['src/**/*.ts'],
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
