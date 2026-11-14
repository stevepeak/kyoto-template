import { config } from '@app/eslint-config/bun.js'

/** @type {import("eslint").Linter.Config[]} */
export default [...config, { ignores: ['.react-email/**'] }]
