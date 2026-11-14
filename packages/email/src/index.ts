/**
 * Transactional email — templates and rendering ONLY.
 *
 * Nothing here sends. Delivery is the Cloudflare `send_email` binding, typed by
 * `@cloudflare/workers-types` — types that clash with the DOM lib these React
 * templates need. Keeping the two apart lets each half typecheck properly: this
 * package renders, `apps/web/lib/email.ts` sends what it produced.
 */
export {
  type RenderedEmail,
  renderPasswordResetEmail,
  renderWelcomeEmail,
} from './render'
export { type PasswordResetEmailProps } from './templates/password-reset'
export { type WelcomeEmailProps } from './templates/welcome'
