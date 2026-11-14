import { cfEnv } from './cf-env'

/**
 * Reusable plumbing for user uploads stored in R2 and served back from our
 * own origin. Each upload kind (avatars, attachments, …) calls `defineR2Upload`
 * once with its bucket binding, URL prefix and limits; its routes then use the
 * returned helpers instead of re-implementing validation, storage and serving.
 *
 * Every upload gets a fresh key, so served objects are cached as immutable and
 * the URL handed back can be stored as-is (e.g. in `user.image`).
 */

/** Binding names in `CloudflareEnv` that hold an R2 bucket. */
type R2Binding = {
  [K in keyof CloudflareEnv]-?: NonNullable<CloudflareEnv[K]> extends R2Bucket
    ? K
    : never
}[keyof CloudflareEnv]

interface R2UploadOptions {
  binding: R2Binding
  /** Where the serving route is mounted, with a trailing slash, e.g. `/api/avatar/`. */
  urlPrefix: string
  maxBytes: number
  /** Never include SVG or HTML: objects are served from our origin. */
  contentTypes: readonly string[]
  /** Human list of the accepted formats, for the 415 error, e.g. "a PNG or JPEG image". */
  typesLabel: string
}

export function defineR2Upload(options: R2UploadOptions) {
  const { binding, urlPrefix, maxBytes, contentTypes, typesLabel } = options

  function bucket(): R2Bucket {
    const b = cfEnv()[binding]
    if (!b) {
      throw new Error(
        `${binding} (R2) binding is not available. Run via \`next dev\` (OpenNext dev proxy) or deploy to Workers.`,
      )
    }
    return b
  }

  function url(key: string): string {
    return `${urlPrefix}${key}`
  }

  /** The R2 key behind a URL, or null for a URL we didn't issue. */
  function keyFromUrl(value: string | null | undefined): string | null {
    if (!value?.startsWith(urlPrefix)) return null
    return value.slice(urlPrefix.length)
  }

  /**
   * Reads and validates the `file` field of a multipart request. Returns the
   * file, or a ready-to-return error response.
   */
  async function readFile(
    req: Request,
  ): Promise<{ file: File } | { error: Response }> {
    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File)) {
      return { error: errorResponse('No file uploaded', 400) }
    }
    if (!contentTypes.includes(file.type)) {
      return { error: errorResponse(`Use ${typesLabel}`, 415) }
    }
    if (file.size > maxBytes) {
      return {
        error: errorResponse(
          `File must be ${formatBytes(maxBytes)} or smaller`,
          413,
        ),
      }
    }
    return { file }
  }

  /** Stores `file` under `<prefix>/<uuid>` and returns its key and URL. */
  async function put(
    prefix: string,
    file: File,
  ): Promise<{ key: string; url: string }> {
    const key = `${prefix}/${crypto.randomUUID()}`
    await bucket().put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    })
    return { key, url: url(key) }
  }

  /** Deletes every object under `<prefix>/` except the keys in `keep`. */
  async function prune(prefix: string, keep: (string | null)[]): Promise<void> {
    const b = bucket()
    const listed = await b.list({ prefix: `${prefix}/` })
    const stale = listed.objects
      .map((o) => o.key)
      .filter((key) => !keep.includes(key))
    if (stale.length > 0) await b.delete(stale)
  }

  /** Streams an object back with immutable caching, or a 404. */
  async function serve(key: string): Promise<Response> {
    const object = await bucket().get(key)
    if (!object) return new Response('Not found', { status: 404 })
    return new Response(object.body, {
      headers: {
        'Content-Type':
          object.httpMetadata?.contentType ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        ETag: object.httpEtag,
      },
    })
  }

  return {
    maxBytes,
    contentTypes,
    bucket,
    url,
    keyFromUrl,
    readFile,
    put,
    prune,
    serve,
  }
}

function errorResponse(error: string, status: number): Response {
  return Response.json({ error }, { status })
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1
    ? `${Number(mb.toFixed(1))} MB`
    : `${Math.round(bytes / 1024)} KB`
}
