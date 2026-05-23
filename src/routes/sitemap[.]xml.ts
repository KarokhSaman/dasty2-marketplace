import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { locales, localizeHref } from '@/src/paraglide/runtime'

// Static public routes worth indexing. Login/signup/account omitted —
// either user-specific or shouldn't rank.
const STATIC_PATHS = ['/'] as const

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlEntry(origin: string, path: string): string {
  // Each `<url>` carries hreflang alternates for SEO across locales.
  const alternates = locales
    .map((locale) => {
      const href = origin + localizeHref(path, { locale })
      return `    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(href)}"/>`
    })
    .join('\n')
  const xDefault = origin + localizeHref(path, { locale: 'en' })
  return `  <url>
    <loc>${escapeXml(origin + path)}</loc>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefault)}"/>
  </url>`
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin

        // Fetch approved products from Convex for dynamic /products/:id entries.
        let productIds: string[] = []
        const convexUrl = process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL
        if (convexUrl) {
          try {
            const client = new ConvexHttpClient(convexUrl)
            const products = await client.query(api.products.getPublic, {})
            productIds = products.map((p: { _id: string }) => p._id)
          } catch {
            // Fail open — emit static-only sitemap if Convex is unreachable.
          }
        }

        const paths = [
          ...STATIC_PATHS,
          ...productIds.map((id) => `/products/${id}`),
        ]
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${paths.map((p) => urlEntry(origin, p)).join('\n')}
</urlset>
`
        return new Response(body, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
