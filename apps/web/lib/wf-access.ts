import { cfVar } from './cf-env'

/**
 * Who may open the 007 workflow console (`/workflows`, `/api/wf`, the 007
 * MCP). It can edit and publish workflows and read every run, so it is an
 * admin surface.
 *
 * TODO: decide the access model (staff email domain, a role column, an org
 * admin flag…). Until then: the comma-separated `WF_ADMIN_EMAILS` allowlist;
 * when it is unset, any signed-in user is allowed under `next dev` and nobody
 * in production.
 */
export function canUseWorkflows(email: string | null | undefined): boolean {
  if (!email) return false
  const allowlist = cfVar('WF_ADMIN_EMAILS')
  if (!allowlist) {
    // eslint-disable-next-line no-process-env
    return process.env.NODE_ENV === 'development'
  }
  return allowlist
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase())
}
