import { createFileRoute } from '@tanstack/react-router'

// Same-origin copy of a product photo, so the admin's browser can read its
// pixels (to rotate it) without the R2 bucket needing a CORS rule for GET.
// Only our own photo hosts are fetched; anything else is refused.
function convexHost(): string {
  try {
    return new URL(import.meta.env.VITE_CONVEX_URL as string).hostname
  } catch {
    return ''
  }
}

function allowedHost(hostname: string): boolean {
  const own = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined) ?? ''
  let ownHost = ''
  try {
    ownHost = own ? new URL(own).hostname : ''
  } catch {}
  return (
    hostname === ownHost ||
    hostname === 'mndallan.com' ||
    hostname.endsWith('.mndallan.com') ||
    hostname === 'dasty2mndalan.com' ||
    hostname.endsWith('.dasty2mndalan.com') ||
    // test uploads live in this site's own Convex file storage
    hostname === convexHost()
  )
}

export const Route = createFileRoute('/api/photo')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get('url') ?? ''
        let url: URL
        try {
          url = new URL(target)
        } catch {
          return new Response('Bad photo URL', { status: 400 })
        }
        if (url.protocol !== 'https:' || !allowedHost(url.hostname)) {
          return new Response('Not a product photo', { status: 403 })
        }
        const res = await fetch(url.toString())
        const type = res.headers.get('content-type') ?? ''
        if (!res.ok || !type.startsWith('image/')) {
          return new Response('Photo not found', { status: 404 })
        }
        return new Response(res.body, {
          headers: { 'content-type': type, 'cache-control': 'private, no-store' },
        })
      },
    },
  },
})
