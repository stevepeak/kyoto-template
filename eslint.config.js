// Imported by relative path on purpose: this is the same file every workspace
// gets via `@app/eslint-config`, and the root has no dependency edge to it.
import { config } from './config/eslint/server.js'

/**
 * The repo root's own lint scope: the root-level files that have no workspace
 * `eslint.config.js` above them. Every workspace lints itself
 * (`turbo run lint`), and ESLint resolves a config per file from that file's
 * own directory upward — so this config ignores the workspaces outright and
 * only covers the remainder (root `package.json`, `scripts/`).
 */
export default [
  ...config,
  {
    // Private monorepo — package.json metadata polish doesn't apply.
    files: ['**/package.json'],
    rules: {
      'package-json/require-files': 'off',
      'package-json/require-license': 'off',
      'package-json/require-repository': 'off',
      'package-json/repository-shorthand': 'off',
      'package-json/valid-workspaces': 'off',
      'package-json/order-properties': 'off',
      'package-json/sort-collections': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/.wrangler/**',
      '**/.next/**',
      '**/.open-next/**',
      '**/coverage/**',
      '**/bin/**',
      // Root-level config files belong to no tsconfig project.
      '*.config.js',
      'knip.config.ts',
      // Every workspace lints itself.
      'apps/**',
      'packages/**',
      'config/**',
      // Agent worktrees and other local tooling state.
      '.claude/**',
    ],
  },
]
