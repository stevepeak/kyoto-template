import { PRIVACY_HREF, TERMS_HREF } from './legal/links'
import { cfVar } from './cf-env'

/** Pages worth indexing — everything else is behind sign-in or a token. */
export const PUBLIC_PAGES = [
  '/',
  '/pricing',
  '/login',
  PRIVACY_HREF,
  TERMS_HREF,
]

/**
 * Areas crawlers should skip even if they find a link: signed-in app pages,
 * one-shot auth flows, and every API route.
 */
export const PRIVATE_PATHS = [
  '/api/',
  '/emails',
  '/settings',
  '/setup',
  '/workflows',
  '/oauth/',
  '/reset-password',
  '/verify-email',
  '/forgot-password',
]

/**
 * Whether search engines may index this deployment: production only, and
 * never when `NOINDEX` is set (PR preview deploys set it — see ci.yml).
 */
export function indexingAllowed(): boolean {
  // eslint-disable-next-line no-process-env
  return process.env.NODE_ENV === 'production' && !cfVar('NOINDEX')
}
