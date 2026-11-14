/**
 * The block vocabulary the legal documents are written in.
 *
 * Structured blocks rather than one string blob so the copy owns no markup:
 * `components/legal/document-view.tsx` decides how each kind looks, and a
 * document can later be rendered to plain text (e.g. to hash an acceptance)
 * from the same source without the two drifting.
 */
export type DocumentBlock =
  /** The document's own name, rendered once at the top. */
  | { kind: 'title'; text: string }
  /** Body prose. A `para` following a `section` continues that section. */
  | { kind: 'para'; text: string }
  /** A numbered section. `heading` is the bolded lead-in of the paragraph. */
  | { kind: 'section'; number: number; heading: string; text: string }
  /** A bulleted list, usually continuing the section above it. */
  | { kind: 'list'; items: readonly string[] }

/** A versioned legal document. */
export interface LegalDocument {
  /**
   * Bump on every change to `blocks`. While it contains `placeholder`, the
   * page shows a "Draft — not final" banner.
   */
  version: string
  /** The date this version took effect, as displayed. */
  effectiveDate: string
  title: string
  blocks: readonly DocumentBlock[]
}
