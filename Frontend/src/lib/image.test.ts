import { describe, expect, it } from 'vitest'
import { isAllowedOperationPhoto, MAX_OPERATION_PHOTO_SIZE_BYTES } from './image'

describe('operation photo validation', () => {
  it('accepts supported image types at the size limit', () => {
    const photo = new File([new Uint8Array(MAX_OPERATION_PHOTO_SIZE_BYTES)], 'inspection.jpg', { type: 'image/jpeg' })
    expect(isAllowedOperationPhoto(photo)).toBe(true)
  })

  it('rejects unsupported image types and files over the size limit', () => {
    const unsupported = new File(['image'], 'photo.gif', { type: 'image/gif' })
    const oversized = new File([new Uint8Array(MAX_OPERATION_PHOTO_SIZE_BYTES + 1)], 'photo.png', { type: 'image/png' })
    expect(isAllowedOperationPhoto(unsupported)).toBe(false)
    expect(isAllowedOperationPhoto(oversized)).toBe(false)
  })
})
