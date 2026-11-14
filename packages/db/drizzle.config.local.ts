import Database from 'better-sqlite3'
import { defineConfig } from 'drizzle-kit'

import { findLocalD1 } from './src/local-d1'

// Local Drizzle Studio for the *local* `template-db` (miniflare-managed SQLite under
// the shared wrangler state — see Tiltfile + `db:migrate:local`).
//
// The default drizzle.config.ts uses the `d1-http` driver and browses the
// REMOTE D1 whenever Cloudflare creds are in .env, so it never reflects local
// dev data. This config points Studio straight at the on-disk SQLite file.
//
// There are now TWO local D1s (template-db and template-wf), both named after a content
// hash, so the file is resolved by the tables it contains rather than by taking
// the first .sqlite in the directory. See src/local-d1.ts for why `exclude`
// matters. For the wf_* side, use drizzle.config.wf.local.ts.
//
// Run from packages/db (the db:studio:local script passes --cwd), so
// cwd-relative paths resolve against the repo root.
function hasTable(file: string, table: string): boolean {
  const db = new Database(file, { readonly: true, fileMustExist: true })
  try {
    return (
      db
        .prepare(
          `select 1 from sqlite_master where type = 'table' and name = ?`,
        )
        .get(table) !== undefined
    )
  } finally {
    db.close()
  }
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: findLocalD1({
      stateDir: '../../.wrangler/state',
      hasTable,
      // An app table 007 does not have — present on any migrated template-db.
      require: ['user'],
      label: 'template-db',
      hint: 'bun run db:migrate:local',
    }),
  },
})
