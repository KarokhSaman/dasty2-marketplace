import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react'
import { useState, type ReactNode } from 'react'
import { api } from '@/convex/_generated/api'
import {
  getLocale,
  getTextDirection,
  locales,
  localizeHref,
} from '@/paraglide/runtime'
import { SellerSessionProvider } from '@/lib/SellerSessionContext'
import { fetchSession, createVerifySpeedAuth } from '@/lib/session'
import { PageScrollbar } from '@/components/ui/PageScrollbar'
import appCss from '@/styles/globals.css?url'

interface RouterContext {
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
}


export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async (ctx) => {
    const locale = getLocale()
    const { jwt } = await fetchSession()

    // Authenticate the SSR Convex client so route-loader queries prefetch as the
    // logged-in user (same token the browser will use over the websocket).
    const http = ctx.context.convexQueryClient.serverHttpClient
    if (jwt) {
      http?.setAuth(jwt)
    }

    // While rendering on the server, look up the seller too, so the header's
    // bell and Sell button are in the page from the start instead of waiting
    // for the browser to log in. undefined = unknown (client navigations or a
    // failed lookup; the live query takes over), null = not a seller.
    let seller: { _id: string } | null | undefined
    if (http) {
      seller = null
      if (jwt) {
        try {
          const doc = await http.query(api.users.getCurrentSeller, {})
          seller = doc ? { _id: doc._id } : null
        } catch {
          seller = undefined
        }
      }
    }
    return { locale, token: jwt, seller }
  },
  head: ({ matches }) => {
    // De-localized pathname (TanStack Router's rewrite.input strips the locale
    // prefix before matching), so we re-localize per language for hreflang.
    const pathname = matches[matches.length - 1]?.pathname ?? '/'

    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { title: 'Mndallan - Buy & Sell Baby Products' },
        {
          name: 'description',
          content: 'کڕین و فرۆشتنی کاڵای منداڵان لە کوردستان، عێراق',
        },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', type: 'image/svg+xml', href: '/logo-mndallan.svg' },
        { rel: 'apple-touch-icon', href: '/logo-mndallan.svg' },
        // hreflang — base locale doubles as x-default for SEO.
        {
          rel: 'alternate',
          hrefLang: 'x-default',
          href: localizeHref(pathname, { locale: 'en' }),
        },
        ...locales.map((locale) => ({
          rel: 'alternate',
          hrefLang: locale,
          href: localizeHref(pathname, { locale }),
        })),
      ],
    }
  },
  notFoundComponent: NotFoundComponent,
  component: RootComponent,
  shellComponent: RootDocument,
})

function NotFoundComponent() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-semibold text-ink">404</h1>
      <p className="text-sm text-ink-soft">Page not found</p>
      <a href="/" className="text-sm font-semibold text-rose-600 underline underline-offset-4">
        Go home
      </a>
    </div>
  )
}

function RootComponent() {
  const { queryClient, convexClient, token, seller } = Route.useRouteContext()
  // Built once from the first page's session; must stay the same hook after.
  const [useAuth] = useState(() => createVerifySpeedAuth(token))

  return (
    <ConvexProviderWithAuth client={convexClient} useAuth={useAuth}>
      <QueryClientProvider client={queryClient}>
        <SellerSessionProvider initialSeller={seller}>
          <Outlet />
        </SellerSessionProvider>
      </QueryClientProvider>
    </ConvexProviderWithAuth>
  )
}

function RootDocument({
  children,
}: {
  children: ReactNode
}) {
  const locale = getLocale()
  const dir = getTextDirection(locale)

  return (
    <html lang={locale} dir={dir} data-locale={locale}>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased bg-cream text-ink min-h-screen-dvh" suppressHydrationWarning>
        {children}
        <PageScrollbar />
        <Scripts />
      </body>
    </html>
  )
}
