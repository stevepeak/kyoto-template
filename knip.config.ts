import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['**/*.config.{js,ts}', 'turbo.json'],
      project: ['**/*.{js,ts,tsx}'],
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.turbo/**',
        '**/coverage/**',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.config.cjs',
        '**/*.config.js',
        '**/seed.sql',
        '**/schema.sql',
        '**/migrations/**',
      ],
      ignoreDependencies: [],
    },
    'apps/web': {
      entry: ['app/**/*.{ts,tsx}'],
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/.eslintrc.json',
      ],
    },
    'apps/workflows': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.wrangler/**',
        '**/*.d.ts',
      ],
    },
    'packages/workflows-client': {
      project: ['src/**/*.ts'],
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    },
    'packages/api': {
      project: ['src/**/*.ts'],
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    },
    'packages/db': {
      project: ['src/**/*.ts'],
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/types.gen.ts',
        '**/*.d.ts',
        '**/migrations/**',
        '**/migrate.ts',
      ],
    },
    'packages/utils': {
      project: ['src/**/*.ts'],
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    },
    'packages/agents': {
      project: ['src/**/*.ts'],
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    },
  },
  ignore: [
    'apps/web/components/ui/**',
    '**/node_modules/**',
    '**/dist/**',
    '**/.turbo/**',
    '**/coverage/**',
    '**/*.d.ts',
    '**/types.gen.ts',
    '**/migrations/**',
  ],
  ignoreDependencies: [],
}

export default config
