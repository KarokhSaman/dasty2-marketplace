import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { matchCity } from '@/lib/cityMatch'

// Cloudflare adds its guess of the visitor's city to every request (from the
// IP address, so it can be off — often the ISP's city). We only use it to
// pre-select a city the seller can change; nothing is stored.

type CfInfo = { city?: string; country?: string }

/** The visitor's city from Cloudflare, if it's one of ours (Iraq only). */
export const guessCity = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeader('Cache-Control', 'private, no-store')
  const cf = (getRequest() as Request & { cf?: CfInfo }).cf
  if (!cf || cf.country !== 'IQ') return { city: null as string | null }
  return { city: matchCity(cf.city) }
})
