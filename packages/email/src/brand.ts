/**
 * How the product names itself in email copy.
 *
 * The sender address is NOT here: it comes from `EMAIL_FROM` /
 * `EMAIL_FROM_NAME` at send time (see `apps/web/lib/email.ts` and
 * `packages/config`), because it must match `allowed_sender_addresses` on the
 * `EMAIL` binding in `apps/web/wrangler.jsonc` and differs per environment.
 */

// TODO: product name — keep in step with `apps/web/lib/brand.ts`.
export const PRODUCT_NAME = 'Kyoto'

// TODO: the bare domain the product is served from, shown in the footer.
export const PRODUCT_DOMAIN = 'example.com'

// TODO: footer copy (legal entity, postal address if required, etc.).
export const FOOTER_TEXT =
  'This is an automated message about your account. Replies to this address are not monitored.'
