import { defineConfig } from 'drizzle-kit'

import { findLocalD1 } from './src/local-d1'

// Local Drizzle Studio for the *local* `template-db` (miniflare-managed SQLite under
// the shared wrangler state — see Tiltfile + `db:migrate:local`).
//
// The default drizzle.config.ts uses the `d1-http` driver and browses the
// REMOTE D1 whenever Cloudflare creds are in .env, so it never reflects local
// dev data. This config points Studio straight at the on-disk SQLite file.
//
// Several local D1s share the state dir (template-db, template-wf, and stale
// ones from earlier database ids), so the file is derived from template-db's
// configured `database_id` — see src/local-d1.ts.
//
// Run from packages/db (the db:studio:local script passes --cwd), so
// cwd-relative paths resolve against the repo root.
export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: findLocalD1({
      stateDir: '../../.wrangler/state',
      wranglerConfig: 'wrangler.jsonc',
      databaseName: 'template-db',
      hint: 'bun run db:migrate:local',
    }),
  },
})
