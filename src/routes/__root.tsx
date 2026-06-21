import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { createServerFn } from '@tanstack/react-start'
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import type { ReactNode } from 'react'
import {
  getLocale,
  getTextDirection,
  locales,
  localizeHref,
} from '@/paraglide/runtime'
import { SellerSessionProvider } from '@/lib/SellerSessionContext'
import appCss from '@/styles/globals.css?url'

interface RouterContext {
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
}

const fetchClerkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId, getToken } = await auth()
  const token = await getToken()

  return { userId, token }
})

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async (ctx) => {
    const locale = getLocale()
    const { userId, token } = await fetchClerkAuth()

    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
    }
    return { locale, userId, token }
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
    <ClerkProvider>
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        <QueryClientProvider client={queryClient}>
          <SellerSessionProvider>
            <Outlet />
          </SellerSessionProvider>
        </QueryClientProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
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
