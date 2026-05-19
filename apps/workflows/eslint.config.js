import { config } from '@kyoto/eslint-config/bun.js'

/** @type {import("eslint").Linter.Config[]} */

export default [
  ...config,
  {
    // Cloudflare Workers runtime globals — provided by @cloudflare/workers-types.
    languageOptions: {
      globals: {
        Env: 'readonly',
        Workflow: 'readonly',
        WorkflowEntrypoint: 'readonly',
        WorkerEntrypoint: 'readonly',
        DurableObject: 'readonly',
        DurableObjectNamespace: 'readonly',
        Queue: 'readonly',
        MessageBatch: 'readonly',
        ScheduledController: 'readonly',
        WebSocketPair: 'readonly',
      },
    },
  },
  {
    ignores: ['.wrangler/**', 'dist/**', 'worker-env.d.ts'],
  },
]
