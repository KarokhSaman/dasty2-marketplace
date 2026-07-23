import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { paraglideMiddleware } from '@/paraglide/server'
import { hardenResponse } from '@/lib/security'
import { ConvexClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const fetch = createStartHandler(defaultStreamHandler)

function explicitUrlLocale(request: Request): 'en' | 'ar' | undefined {
  const match = new URL(request.url).pathname.match(/^\/(en|ar)(?:\/|$)/)
  return match?.[1] as 'en' | 'ar' | undefined
}

function requestWithExplicitUrlLocale(
  request: Request,
  locale: 'en' | 'ar' | undefined,
): Request {
  if (!locale) return request

  // Paraglide remembers language with a cookie, but a locale-prefixed deep link
  // is an explicit choice for this request and must not be redirected according
  // to an older cookie. Keep the original URL/body and override only the cookie
  // seen by the locale middleware.
  const headers = new Headers(request.headers)
  const cookies = (headers.get('cookie') ?? '')
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie && !cookie.startsWith('dasty2-lang='))
  cookies.push(`dasty2-lang=${locale}`)
  headers.set('cookie', cookies.join('; '))
  return new Request(request, { headers })
}

export default {
  async fetch(request: Request): Promise<Response> {
    // Pass the original URL to the handler — TanStack Router's `rewrite`
    // option de-localizes it itself. `localizedRequest` differs only in the
    // internal locale-cookie override used for explicit deep links.
    // (See paraglideMiddleware docs.)
    const urlLocale = explicitUrlLocale(request)
    const localizedRequest = requestWithExplicitUrlLocale(request, urlLocale)
    const response = await paraglideMiddleware(
      localizedRequest,
      () => fetch(localizedRequest),
    )
    const hardened = hardenResponse(request, response)
    if (urlLocale) {
      hardened.headers.append(
        'Set-Cookie',
        `dasty2-lang=${urlLocale}; Path=/; Max-Age=34560000; SameSite=Lax`,
      )
    }
    return hardened
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Run cleanup of expired featured products daily
    try {
      console.log('[Cron] Starting cleanup of expired featured products...')

      const client = new ConvexClient(env.VITE_CONVEX_URL)
      const result = await client.mutation(api.products.cleanupExpiredFeatured, {})

      console.log(`[Cron] ✓ Unfeatured ${result.unfeatureCount} products`)
    } catch (error) {
      console.error('[Cron] ✗ Cleanup failed:', error)
    }
  },
}
