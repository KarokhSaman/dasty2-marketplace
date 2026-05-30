const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
} as const

export function hardenResponse(request: Request, response: Response): Response {
  const url = new URL(request.url)
  const hardened = new Response(response.body, response)

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    hardened.headers.set(name, value)
  }

  if (url.pathname.startsWith('/api/') && !hardened.headers.has('Cache-Control')) {
    hardened.headers.set('Cache-Control', 'no-store')
  }

  return hardened
}

export function secureCookieOptions(request: Request) {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: new URL(request.url).protocol === 'https:',
  }
}

export function logInfo(message: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: 'info', message, ...fields }))
}

export function logWarning(message: string, fields: Record<string, unknown> = {}) {
  console.warn(JSON.stringify({ level: 'warn', message, ...fields }))
}
