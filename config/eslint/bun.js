import { createConfig } from './create.js'

/**
 * The React-enabled preset: for workspaces that actually have a `react`
 * dependency (`apps/web`, `packages/email`). Everything server-only should
 * import `@kyoto/eslint-config/server.js` instead — same rules, without the two
 * React plugin sets. See `create.js` for why the split exists.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = await createConfig({ react: true })
