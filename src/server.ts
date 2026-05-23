import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { paraglideMiddleware } from '@/src/paraglide/server'

const fetch = createStartHandler(defaultStreamHandler)

export default {
  async fetch(request: Request): Promise<Response> {
    // Pass the *original* request to the handler — TanStack Router's `rewrite`
    // option de-localizes the URL itself, so handing it the middleware's
    // already-de-localized request would cause a rewrite loop.
    // (See paraglideMiddleware docs.)
    return paraglideMiddleware(request, () => fetch(request))
  },
}
