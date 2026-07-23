import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react'
import type { ReactNode } from 'react'
import {
  getLocale,
  getTextDirection,
  locales,
  localizeHref,
} from '@/paraglide/runtime'
import { SellerSessionProvider } from '@/lib/SellerSessionContext'
import { fetchSession, useVerifySpeedAuth } from '@/lib/session'
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
    if (jwt) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(jwt)
    }
    return { locale, token: jwt }
  },
  head: ({ matches }) => {
    // De-localized pathname (TanStack Router's rewrite.input strips the locale
    // prefix before matching), so we re-localize per language for hreflang.
    const pathname = matches[matches.length - 1]?.pathname ?? '/'
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { title: 'Dasty2 Mndalan — Baby Products Erbil' },
        {
          name: 'description',
          content: 'Buy and sell baby products in Erbil, Iraq',
        },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
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
  const { queryClient, convexClient } = Route.useRouteContext()

  return (
    <ConvexProviderWithAuth client={convexClient} useAuth={useVerifySpeedAuth}>
      <QueryClientProvider client={queryClient}>
        <SellerSessionProvider>
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
        <Scripts />
      </body>
    </html>
  )
}
