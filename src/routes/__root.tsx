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
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import type { ReactNode } from 'react'
import {
  getLocale,
  getTextDirection,
  locales,
  localizeHref,
} from '@/src/paraglide/runtime'
import { SellerSessionProvider } from '@/lib/SellerSessionContext'
import appCss from '@/src/styles/globals.css?url'

const fetchClerkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId, getToken } = await auth()
  const token = await getToken({ template: 'convex' })
  return { userId, token }
})

interface RouterContext {
  queryClient: QueryClient
  convexClient: ConvexReactClient
  convexQueryClient: ConvexQueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async (ctx) => {
    const locale = getLocale()
    const auth = await fetchClerkAuth().catch(() => ({
      userId: null,
      token: null,
    }))
    if (auth.token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(auth.token)
    }
    return { locale, userId: auth.userId, token: auth.token }
  },
  head: ({ matches }) => {
    // De-localized pathname (TanStack Router's rewrite.input strips the locale
    // prefix before matching), so we re-localize per language for hreflang.
    const pathname = matches[matches.length - 1]?.pathname ?? '/'
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
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
          hreflang: 'x-default',
          href: localizeHref(pathname, { locale: 'en' }),
        },
        ...locales.map((locale) => ({
          rel: 'alternate',
          hreflang: locale,
          href: localizeHref(pathname, { locale }),
        })),
      ],
    }
  },
  component: RootComponent,
})

function RootComponent() {
  const { queryClient, convexClient, locale } = Route.useRouteContext()
  const dir = getTextDirection(locale)

  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        <QueryClientProvider client={queryClient}>
          <SellerSessionProvider>
            <RootDocument locale={locale} dir={dir}>
              <Outlet />
            </RootDocument>
          </SellerSessionProvider>
        </QueryClientProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

function RootDocument({
  children,
  locale,
  dir,
}: {
  children: ReactNode
  locale: string
  dir: string
}) {
  return (
    <html lang={locale} dir={dir} data-locale={locale}>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased bg-gray-50 min-h-screen">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
