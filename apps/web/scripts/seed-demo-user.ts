import { findLocalD1 } from '@app/db/local-d1'
import { hashPassword } from 'better-auth/crypto'
import { Database } from 'bun:sqlite'

import { DEMO_USER } from '../lib/demo-user'

// Seeds a demo email/password account into the LOCAL template-db so a fresh dev
// environment can sign in without going through sign-up.
//
// Writes the same rows Better Auth's sign-up would: a `user` plus a
// `credential` account whose `account_id` is the user id, with the password
// hashed by Better Auth's own scrypt `hashPassword` so sign-in verifies it.
//
// Idempotent: re-running resets the password on the existing account.
//
// Run from apps/web: `bun run db:seed:local`.

const {
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
  name: DEMO_NAME,
} = DEMO_USER

// Not `readonly`: a read-only handle can't open a database whose WAL still
// needs recovering, which miniflare's files often do.
function hasTable(file: string, table: string): boolean {
  const db = new Database(file, { readwrite: true, create: false })
  try {
    return (
      db
        .query(`select 1 from sqlite_master where type = 'table' and name = ?`)
        .get(table) !== null
    )
  } finally {
    db.close()
  }
}

const file = findLocalD1({
  stateDir: '../../.wrangler/state',
  hasTable,
  require: ['user'],
  label: 'template-db',
  hint: 'bun run db:migrate:local',
})

const db = new Database(file)
const passwordHash = await hashPassword(DEMO_PASSWORD)
const now = Math.floor(Date.now() / 1000)

db.transaction(() => {
  const existing = db
    .query<{ id: string }, [string]>(`select id from user where email = ?`)
    .get(DEMO_EMAIL)
  const userId = existing?.id ?? crypto.randomUUID()

  if (!existing) {
    db.run(
      `insert into user (id, name, email, email_verified, created_at, updated_at)
       values (?, ?, ?, 1, ?, ?)`,
      [userId, DEMO_NAME, DEMO_EMAIL, now, now],
    )
  }

  db.run(
    `insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
     values (?, ?, 'credential', ?, ?, ?, ?)
     on conflict (provider_id, account_id) do update
       set password = excluded.password, updated_at = excluded.updated_at`,
    [crypto.randomUUID(), userId, userId, passwordHash, now, now],
  )
})()

db.close()
console.log(`Seeded ${DEMO_EMAIL} / ${DEMO_PASSWORD} into ${file}`)
