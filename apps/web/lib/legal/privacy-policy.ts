/**
 * TEMPLATE PRIVACY POLICY — NOT LEGAL ADVICE.
 *
 * This is an outline of sections a privacy policy commonly has, with every
 * company-specific fact left as a visible `[TODO: …]` placeholder. It has not
 * been written or reviewed by a lawyer and is not fit to publish as-is. Have
 * counsel review and rewrite it for your product, jurisdiction(s) and data
 * practices (e.g. GDPR, UK GDPR, CCPA/CPRA) before launch.
 *
 * When the real text lands, change `version` so it no longer contains
 * `placeholder` — that removes the draft banner.
 */
import type { LegalDocument } from './blocks'

export const PRIVACY_POLICY: LegalDocument = {
  // TODO: real version + effective date once counsel signs off.
  version: 'v0-placeholder',
  effectiveDate: '[TODO]',
  title: 'Privacy Policy',
  blocks: [
    { kind: 'title', text: 'Privacy Policy' },
    {
      kind: 'para',
      text: 'TEMPLATE TEXT — this policy is a placeholder and is not final. Bracketed [TODO] items must be completed and the whole document reviewed by counsel before it is relied on.',
    },
    {
      kind: 'section',
      number: 1,
      heading: 'Who We Are',
      text: 'This policy explains how [TODO: legal entity name] (“we”, “us”), operator of [TODO: product name] (the “Service”), collects, uses and shares personal information. [TODO: registered address; data protection officer or representative, if required].',
    },
    {
      kind: 'section',
      number: 2,
      heading: 'Information We Collect',
      text: 'We collect the following categories of information:',
    },
    {
      kind: 'list',
      items: [
        'Account information you provide, such as your name, email address and sign-in credentials (including passkeys or a linked Google account, if you use them).',
        'Content you submit to the Service. [TODO: describe what users store or upload].',
        'Technical and usage information generated when you use the Service, such as IP address, device and browser details, and logs. [TODO: confirm and complete].',
        '[TODO: any other categories, e.g. payment information, communications with support].',
      ],
    },
    {
      kind: 'section',
      number: 3,
      heading: 'How We Use Information',
      text: 'We use information to provide, secure and improve the Service, to authenticate you, to communicate with you about your account (for example password reset emails), and to comply with legal obligations. [TODO: list each purpose and, where applicable, its legal basis].',
    },
    {
      kind: 'section',
      number: 4,
      heading: 'Cookies and Analytics',
      text: 'We use cookies that are necessary to keep you signed in. [TODO: describe any analytics or product-telemetry tools in use (e.g. PostHog, if enabled), what they collect, and how to opt out; add a cookie banner if required in your jurisdiction].',
    },
    {
      kind: 'section',
      number: 5,
      heading: 'Service Providers and Subprocessors',
      text: 'We share information with service providers who process it on our behalf:',
    },
    {
      kind: 'list',
      items: [
        'Cloudflare, Inc. — hosting, database, storage, email delivery and network infrastructure.',
        '[TODO: identity providers, e.g. Google, if Google sign-in is enabled].',
        '[TODO: analytics, error monitoring, AI/model providers and any other subprocessors].',
      ],
    },
    {
      kind: 'para',
      text: 'We do not sell personal information. [TODO: confirm; describe any other disclosures, e.g. legal requests or business transfers].',
    },
    {
      kind: 'section',
      number: 6,
      heading: 'Data Retention',
      text: 'We keep personal information for as long as your account is active and as needed for the purposes above. [TODO: retention periods for account data, content, logs and backups; what happens on account deletion].',
    },
    {
      kind: 'section',
      number: 7,
      heading: 'International Transfers',
      text: '[TODO: where data is stored and processed, and the safeguards used for cross-border transfers, if applicable].',
    },
    {
      kind: 'section',
      number: 8,
      heading: 'Your Rights',
      text: 'Depending on where you live, you may have rights to access, correct, delete or export your personal information, and to object to or restrict certain processing. [TODO: list the rights that apply, how to exercise them, and how to complain to a supervisory authority].',
    },
    {
      kind: 'section',
      number: 9,
      heading: 'Security',
      text: 'We use reasonable technical and organizational measures to protect personal information. [TODO: review this statement].',
    },
    {
      kind: 'section',
      number: 10,
      heading: 'Children',
      text: 'The Service is not directed to children under [TODO: minimum age], and we do not knowingly collect their personal information.',
    },
    {
      kind: 'section',
      number: 11,
      heading: 'Changes to This Policy',
      text: 'We may update this policy from time to time. We will post the new version here with a new effective date and, where required, notify you. [TODO: notice mechanism].',
    },
    {
      kind: 'section',
      number: 12,
      heading: 'Contact',
      text: 'Questions about this policy or your information can be sent to [TODO: privacy contact email] or [TODO: postal address].',
    },
  ],
}
