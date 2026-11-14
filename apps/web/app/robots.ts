import type { MetadataRoute } from 'next'

import { resourceUrl } from '@/lib/mcp-resources'
import { indexingAllowed, PRIVATE_PATHS } from '@/lib/seo'

// Reads the deployment's vars, so it's built per request, not at build time.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed()) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    sitemap: resourceUrl('/sitemap.xml'),
  }
}
