import type { DocumentBlock, LegalDocument } from '@/lib/legal/blocks'

/**
 * Renders a legal document's blocks. Presentation only — the words all come
 * from `lib/legal/*`, so this component owns none of its own.
 */
function Block({ block }: { block: DocumentBlock }) {
  switch (block.kind) {
    case 'title':
      return (
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {block.text}
        </h1>
      )
    case 'para':
      return <p className="leading-relaxed">{block.text}</p>
    case 'section':
      return (
        <p className="leading-relaxed">
          <span className="font-semibold text-gray-900">
            {block.number}. {block.heading}.
          </span>{' '}
          {block.text}
        </p>
      )
    case 'list':
      return (
        <ul className="list-disc space-y-1 pl-6 leading-relaxed">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
  }
}

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <article className="space-y-4 text-sm text-gray-700">
      {document.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </article>
  )
}
