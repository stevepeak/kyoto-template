import { defineR2Upload } from './r2-upload'

/**
 * Profile pictures live in the AVATARS R2 bucket under `<userId>/<uuid>` and
 * are served back by `/api/avatar/<userId>/<uuid>`.
 */
export const avatars = defineR2Upload({
  binding: 'AVATARS',
  urlPrefix: '/api/avatar/',
  maxBytes: 2 * 1024 * 1024,
  // No SVG: it's served from our origin, and SVG can carry script.
  contentTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  typesLabel: 'a PNG, JPEG, WebP or GIF image',
})
