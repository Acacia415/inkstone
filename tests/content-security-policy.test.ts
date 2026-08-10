import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy } from '../src/worker/lib/content-security-policy'

describe('content security policy', () => {
  it('keeps ordinary pages restricted to same-origin form submissions', () => {
    const policy = contentSecurityPolicy(new URL('https://inkstone.example/'))

    expect(policy).toContain("form-action 'self';")
  })

  it('allows only the current Codex loopback callback origin on the authorization page', () => {
    const requestUrl = new URL('https://inkstone.example/authorize')
    requestUrl.searchParams.set('redirect_uri', 'http://127.0.0.1:59920/callback/session')

    const policy = contentSecurityPolicy(requestUrl)

    expect(policy).toContain("form-action 'self' http://127.0.0.1:59920;")
    expect(policy).not.toContain('/callback/session')
  })

  it.each([
    'https://attacker.example/callback',
    'http://192.168.1.10:59920/callback',
    'not a url',
  ])('does not allow a non-loopback OAuth callback: %s', (redirectUri) => {
    const requestUrl = new URL('https://inkstone.example/authorize')
    requestUrl.searchParams.set('redirect_uri', redirectUri)

    expect(contentSecurityPolicy(requestUrl)).toContain("form-action 'self';")
  })
})
