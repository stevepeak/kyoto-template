// @app/wf-host — this app's host wiring for the @stevepeak/007 workflow SDK.
//
// Import `wfConfig` in the workflows Worker (to run nodes) and in the web app
// (editor model/tool/trigger lists + data route). Workflows and agents
// themselves live in the WF_DB database and are authored in the /workflows UI.

export { ensureChatWorkflow } from './chat'
export { wfConfig } from './config'
export { buildRunDeps, type HostDeps } from './deps'
export type { HostEnv } from './env'
export { runScopeFromContext } from './run-scope'
