/**
 * Client side of `defineR2Upload` (lib/r2-upload.ts): posts `file` as the
 * `file` field of a multipart request to an upload route and returns the URL
 * it stored the object at, or the route's error message.
 */
export async function uploadFile(
  endpoint: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch(endpoint, { method: 'POST', body }).catch(() => null)
  if (!res) return { error: 'Upload failed — check your connection' }
  const json = (await res.json().catch(() => ({}))) as {
    url?: string
    error?: string
  }
  if (!res.ok || !json.url) return { error: json.error || 'Upload failed' }
  return { url: json.url }
}
