import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './renderer'

describe('private attachment video rendering', () => {
  it('keeps a controlled same-origin video element', () => {
    const result = renderMarkdown(
      '<video controls preload="metadata" src="/api/files/01k00000000000000000000000"></video>',
    )

    expect(result.html).toContain('<video')
    expect(result.html).toContain('controls=""')
    expect(result.html).toContain('preload="metadata"')
    expect(result.html).toContain('src="/api/files/01k00000000000000000000000"')
  })
})
