/**
 * TEMPLATE TERMS OF USE — NOT LEGAL ADVICE.
 *
 * This is an outline of sections terms of use commonly have, with every
 * company-specific fact left as a visible `[TODO: …]` placeholder. It has not
 * been written or reviewed by a lawyer and is not fit to publish as-is. Have
 * counsel review and rewrite it for your product and jurisdiction(s) before
 * launch.
 *
 * When the real text lands, change `version` so it no longer contains
 * `placeholder` — that removes the draft banner.
 */
import type { LegalDocument } from './blocks'

export const TERMS_OF_USE: LegalDocument = {
  // TODO: real version + effective date once counsel signs off.
  version: 'v0-placeholder',
  effectiveDate: '[TODO]',
  title: 'Terms of Use',
  blocks: [
    { kind: 'title', text: 'Terms of Use' },
    {
      kind: 'para',
      text: 'TEMPLATE TEXT — these terms are a placeholder and are not final. Bracketed [TODO] items must be completed and the whole document reviewed by counsel before it is relied on.',
    },
    {
      kind: 'section',
      number: 1,
      heading: 'Acceptance of These Terms',
      text: 'These terms govern your use of [TODO: product name] (the “Service”), provided by [TODO: legal entity name] (“we”, “us”). By creating an account or using the Service you agree to these terms and to our Privacy Policy. [TODO: minimum age / capacity requirements; terms for business customers, if any].',
    },
    {
      kind: 'section',
      number: 2,
      heading: 'Accounts',
      text: 'You are responsible for the accuracy of the information you provide, for keeping your credentials secure, and for activity under your account. Tell us promptly at [TODO: contact email] if you suspect unauthorized use.',
    },
    {
      kind: 'section',
      number: 3,
      heading: 'Acceptable Use',
      text: 'You may not use the Service to break the law, infringe others’ rights, distribute malware, attempt to gain unauthorized access, interfere with the Service, or [TODO: product-specific restrictions].',
    },
    {
      kind: 'section',
      number: 4,
      heading: 'Your Content',
      text: 'You keep ownership of content you submit. You grant us the licence needed to host, process and display it in order to operate the Service. [TODO: scope of licence; any use of content for AI or product improvement; content removal policy].',
    },
    {
      kind: 'section',
      number: 5,
      heading: 'Our Intellectual Property',
      text: 'The Service, including its software and branding, is owned by [TODO: legal entity name] or its licensors. Except for the limited right to use the Service under these terms, no rights are granted to you.',
    },
    {
      kind: 'section',
      number: 6,
      heading: 'Third-Party Services',
      text: 'The Service may link to or integrate with third-party services (for example, signing in with Google). Your use of those services is governed by their own terms, and we are not responsible for them.',
    },
    {
      kind: 'section',
      number: 7,
      heading: 'Fees',
      text: '[TODO: pricing, billing, renewals and refunds — or state that the Service is free; delete this section if not applicable].',
    },
    {
      kind: 'section',
      number: 8,
      heading: 'Disclaimers',
      text: 'The Service is provided “as is” and “as available”, without warranties of any kind, to the extent permitted by law. [TODO: counsel to draft jurisdiction-appropriate disclaimer].',
    },
    {
      kind: 'section',
      number: 9,
      heading: 'Limitation of Liability',
      text: '[TODO: counsel to draft — liability cap, excluded damages, and any carve-outs required by applicable law].',
    },
    {
      kind: 'section',
      number: 10,
      heading: 'Suspension and Termination',
      text: 'You may stop using the Service at any time. We may suspend or terminate access if you breach these terms or where required by law. [TODO: notice periods; what happens to your data on termination].',
    },
    {
      kind: 'section',
      number: 11,
      heading: 'Governing Law and Disputes',
      text: 'These terms are governed by the laws of [TODO: jurisdiction]. [TODO: venue / dispute-resolution mechanism].',
    },
    {
      kind: 'section',
      number: 12,
      heading: 'Changes to These Terms',
      text: 'We may update these terms from time to time. We will post the new version here with a new effective date and, where changes are material, notify you. [TODO: notice mechanism and period].',
    },
    {
      kind: 'section',
      number: 13,
      heading: 'Contact',
      text: 'Questions about these terms can be sent to [TODO: contact email] or [TODO: postal address].',
    },
  ],
}
