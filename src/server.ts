import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { paraglideMiddleware } from '@/src/paraglide/server'
import { hardenResponse } from '@/src/server/security'

const fetch = createStartHandler(defaultStreamHandler)

export default {
  async fetch(request: Request): Promise<Response> {
    // Pass the *original* request to the handler — TanStack Router's `rewrite`
    // option de-localizes the URL itself, so handing it the middleware's
    // already-de-localized request would cause a rewrite loop.
    // (See paraglideMiddleware docs.)
    const response = await paraglideMiddleware(request, () => fetch(request))
    return hardenResponse(request, response)
  },
}
