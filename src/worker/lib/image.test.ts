import { describe, expect, it } from 'vitest'
import { hasExpectedVideoSignature, isInlineSafe, safeAttachmentMime } from './image'

describe('video attachment MIME validation', () => {
  it('accepts ISO BMFF video and WebM signatures', () => {
    const mp4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])
    const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01])

    expect(hasExpectedVideoSignature(mp4, 'video/mp4')).toBe(true)
    expect(hasExpectedVideoSignature(webm, 'video/webm')).toBe(true)
    expect(safeAttachmentMime(mp4, 'video/mp4')).toBe('video/mp4')
    expect(safeAttachmentMime(webm, 'video/webm')).toBe('video/webm')
    expect(isInlineSafe('video/mp4')).toBe(true)
  })

  it('downgrades a forged video MIME type', () => {
    expect(safeAttachmentMime(new Uint8Array([1, 2, 3, 4]), 'video/mp4'))
      .toBe('application/octet-stream')
  })
})
