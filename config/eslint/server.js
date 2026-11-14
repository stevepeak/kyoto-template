import { createConfig } from './create.js'

/**
 * The server preset: identical to `bun.js` minus the React plugins, for the
 * workspaces with no `react` dependency — which is most of them. See
 * `create.js` for the cost and the false positives that motivated the split.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = await createConfig({ react: false })
