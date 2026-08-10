const OAUTH_LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]'])

export function contentSecurityPolicy(requestUrl: URL): string {
  const imageSchemes = requestUrl.protocol === 'https:' ? 'https:' : 'https: http:'
  const formActions = authorizationFormActions(requestUrl)
  return "default-src 'self'; base-uri 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
    `img-src 'self' data: blob: ${imageSchemes}; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; ` +
    `manifest-src 'self'; media-src 'self' blob:; form-action ${formActions}; frame-src 'none'; ` +
    "frame-ancestors 'none'; object-src 'none'"
}

function authorizationFormActions(requestUrl: URL): string {
  const sources = ["'self'"]
  if (requestUrl.pathname !== '/authorize') return sources.join(' ')

  const redirectUri = requestUrl.searchParams.get('redirect_uri')
  if (!redirectUri) return sources.join(' ')

  try {
    const redirect = new URL(redirectUri)
    if (redirect.protocol === 'http:' && OAUTH_LOOPBACK_HOSTS.has(redirect.hostname)) {
      sources.push(redirect.origin)
    }
  } catch {
  }
  return sources.join(' ')
}
