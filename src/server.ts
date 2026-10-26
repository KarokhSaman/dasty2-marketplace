import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { paraglideMiddleware } from '@/paraglide/server'
import { hardenResponse } from '@/lib/security'
import { ConvexClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { firstVisitLanguage } from '@/lib/cityMatch'

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

const LANG_COOKIE = 'dasty2-lang'
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview/i

// First visit only (no language cookie, no /en or /ar in the address, a real
// page load by a person): pick the language from Cloudflare's location (see
// firstVisitLanguage). Once a language is saved in the cookie — including one
// the visitor picks by hand — this never runs again for that browser.
// Crawlers keep the default (Kurdish) so search results stay stable. Returns
// undefined when the usual rules (cookie, address, default) should decide.
function firstVisitLocale(request: Request): 'ckb' | 'en' | 'ar' | undefined {
  if (request.method !== 'GET') return undefined
  if (!(request.headers.get('accept') ?? '').includes('text/html')) return undefined
  const { pathname } = new URL(request.url)
  if (/^\/(en|ar|ckb)(\/|$)/.test(pathname) || pathname.startsWith('/api/') || pathname.startsWith('/_serverFn')) return undefined
  if ((request.headers.get('cookie') ?? '').split(';').some((c) => c.trim().startsWith(`${LANG_COOKIE}=`))) return undefined
  if (BOT.test(request.headers.get('user-agent') ?? '')) return undefined
  const cf = (request as Request & { cf?: { country?: string; continent?: string; region?: string; regionCode?: string; city?: string } }).cf
  if (!cf?.country) return undefined
  return firstVisitLanguage(cf)
}

export default {
  async fetch(request: Request): Promise<Response> {
    // Pass the original URL to the handler — TanStack Router's `rewrite`
    // option de-localizes it itself. `localizedRequest` differs only in the
    // internal locale-cookie override used for explicit deep links.
    // (See paraglideMiddleware docs.)
    const urlLocale = explicitUrlLocale(request)
    const geoLocale = urlLocale ? undefined : firstVisitLocale(request)
    // English or Arabic for a first visit: hand the locale middleware that
    // cookie so it redirects to the /en or /ar address as usual.
    const localizedRequest = geoLocale && geoLocale !== 'ckb'
      ? requestWithExplicitUrlLocale(request, geoLocale)
      : requestWithExplicitUrlLocale(request, urlLocale)
    const response = await paraglideMiddleware(
      localizedRequest,
      () => fetch(localizedRequest),
    )
    const hardened = hardenResponse(request, response)
    const remember = urlLocale ?? geoLocale
    if (remember) {
      hardened.headers.append(
        'Set-Cookie',
        `dasty2-lang=${remember}; Path=/; Max-Age=34560000; SameSite=Lax`,
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
