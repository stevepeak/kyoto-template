import type { ToolRegistryEntry } from '@stevepeak/007'
import {
  createIndexDocumentTool,
  createSearchDocumentsTool,
  type VectorizeToolOptions,
} from '@stevepeak/007/cloudflare/vectorize'

import type { HostDeps } from '../deps'

// 007's document search built-ins — `index_document` (Tool node) and
// `search_documents` (agent tool) — on Workers AI + Vectorize. The run's
// `scopeId` is the Vectorize namespace, so scoped runs only see their own
// documents. The index is `template-documents` (1024-dim cosine, BGE-M3).

/** Missing-binding error naming the binding, instead of `undefined.query`. */
function required<T>(args: { value: T | undefined; name: string }): T {
  if (!args.value) {
    throw new Error(`Document tools need the ${args.name} binding.`)
  }
  return args.value
}

const vectorize: VectorizeToolOptions<HostDeps> = {
  getIndex: (deps) => {
    return required({
      value: deps.env.DOCUMENTS_INDEX,
      name: 'DOCUMENTS_INDEX',
    })
  },
  getAI: (deps) => {
    return required({ value: deps.env.AI, name: 'AI' })
  },
  getNamespace: (deps) => {
    return deps.scopeId || undefined
  },
}

export const documentToolEntries: ToolRegistryEntry<HostDeps>[] = [
  createIndexDocumentTool(vectorize),
  createSearchDocumentsTool(vectorize),
]
