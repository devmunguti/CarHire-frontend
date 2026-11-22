import type { DriveMode } from '../../api/types'

export const MAX_LICENCE_SIZE_BYTES = 5 * 1024 * 1024

const licenceMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

export function getCheckoutSteps(mode: DriveMode) {
  return mode === 'chauffeur'
    ? ['details', 'terms', 'payment'] as const
    : ['details', 'licence', 'terms', 'payment'] as const
}

export function validateLicenceFile(file: File): string | null {
  if (!licenceMimeTypes.has(file.type)) return 'Upload a JPG, PNG, WebP, or PDF file.'
  if (file.size > MAX_LICENCE_SIZE_BYTES) return 'The file must be 5 MB or smaller.'
  return null
}

export function guestManageUrl(reference: string, confirmation = false) {
  const suffix = confirmation ? '/confirmation' : ''
  return `/booking/${encodeURIComponent(reference)}${suffix}`
}
