/**
 * The demo account seeded into the LOCAL database by
 * `scripts/seed-demo-user.ts`, and used by the dev-only one-click sign-in on
 * the login card. Never seeded remotely.
 */
export const DEMO_USER = {
  email: 'admin@example.com',
  password: 'admin',
  name: 'Admin',
} as const
