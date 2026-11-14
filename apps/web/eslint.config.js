import { config } from '@kyoto/eslint-config/bun.js'

/**
 * Worker-only imports. The web app runs on Next.js (OpenNext) where
 * `cloudflare:workers` does not exist, so pulling in worker-only modules here
 * crashes at module-eval. They belong to apps/workflows; the web app talks to
 * them over the WORKFLOWS service binding.
 */
const workerOnly = {
  paths: [
    {
      name: '@stevepeak/007/cloudflare/runtime',
      message:
        'Worker-only (imports cloudflare:workers). Use it in apps/workflows, not the web app.',
    },
  ],
  patterns: [
    {
      group: ['cloudflare:workers'],
      message:
        'Not available in the web app runtime. This module belongs in apps/workflows.',
    },
  ],
}

/**
 * Server-only packages, banned from anything that reaches the browser bundle.
 * Type-only imports are fine — they erase before bundling.
 */
const serverOnly = [
  {
    group: ['@app/api', '@app/api/*'],
    message:
      'Do not import from @app/api in client-side code. Use @app/utils for shared constants and types, or use tRPC hooks for data fetching.',
    allowTypeImports: true,
  },
  {
    group: ['@app/db', '@app/db/*'],
    message:
      'Do not import from @app/db in client-side code. Use tRPC for database access.',
    allowTypeImports: true,
  },
]

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    rules: {
      'no-restricted-imports': ['error', workerOnly],
    },
  },
  {
    // The client/server boundary. `app/api/**` is exempt: route handlers ARE
    // the server. `lib/**` is deliberately not listed — it mixes browser
    // helpers (`auth-client.ts`) with server boot modules (`auth.ts`, `db.ts`).
    // Both blocks set `no-restricted-imports`; the later one wins for the files
    // it matches, so it restates `workerOnly`.
    files: [
      'app/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'hooks/**/*.{ts,tsx}',
    ],
    ignores: ['app/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { ...workerOnly, patterns: [...workerOnly.patterns, ...serverOnly] },
      ],
    },
  },
  {
    ignores: [
      '.next/**',
      '.open-next/**',
      '.storybook/**',
      'components/ui/**',
      'next.config.js',
      'postcss.config.cjs',
      'tailwind.config.cjs',
      'cloudflare-env.d.ts',
    ],
  },
]
