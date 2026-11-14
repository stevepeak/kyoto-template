import type { MetadataRoute } from 'next'

import { resourceUrl } from '@/lib/mcp-resources'
import { PUBLIC_PAGES } from '@/lib/seo'

// Reads the deployment's vars, so it's built per request, not at build time.
export const dynamic = 'force-dynamic'

// TODO: add marketing/docs pages here as they're built.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({ url: resourceUrl(path) }))
}
