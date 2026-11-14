import { defineConfig } from 'drizzle-kit'

// `db:generate` needs no credentials — it diffs the schema against
// ./migrations. `db:studio` browses the REMOTE D1 over the d1-http driver
// when Cloudflare creds are in .env; use `db:studio:local` for local dev data.
/* eslint-disable no-process-env */
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const databaseId = process.env.D1_DATABASE_ID
const token = process.env.CLOUDFLARE_API_TOKEN
/* eslint-enable no-process-env */

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  ...(accountId && databaseId && token
    ? { driver: 'd1-http', dbCredentials: { accountId, databaseId, token } }
    : {}),
})
