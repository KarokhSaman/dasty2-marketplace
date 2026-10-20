import { createServerFn } from '@tanstack/react-start'
import { getCookie, getRequest } from '@tanstack/react-start/server'
import { fetchAction } from 'convex/nextjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/convex/_generated/api'
import { convexServerOptions } from '@/lib/convex'
import { setSessionCookie } from '@/lib/session.server'

// The session cookie holds the RS256 JWT minted by convex/authActions.verifyOtp.
// It is httpOnly, so the browser can only read it back through this server fn —
// which is exactly what ConvexProviderWithAuth needs for its access token.
export const SESSION_COOKIE = 'dasty2-session'

// Re-mint the session (see session.server.ts) at most once a day per user.
const REFRESH_AFTER_SECONDS = 24 * 60 * 60

function tokenTimes(jwt: string): { iat: number; exp: number } | null {
  try {
    const payload = jwt.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { iat, exp } = JSON.parse(json) as { iat?: number; exp?: number }
    return typeof iat === 'number' && typeof exp === 'number' ? { iat, exp } : null
  } catch {
    return null
  }
}

// Sessions issued before the 400-day change lived 30 days. Upgrade those on the
// next request instead of waiting for them to age past REFRESH_AFTER_SECONDS.
const LONG_LIVED_SECONDS = 365 * 24 * 60 * 60

function needsRefresh(jwt: string): boolean {
  const t = tokenTimes(jwt)
  if (!t) return true
  if (t.exp - t.iat < LONG_LIVED_SECONDS) return true
  return Date.now() / 1000 - t.iat >= REFRESH_AFTER_SECONDS
}

export const fetchSession = createServerFn({ method: 'GET' }).handler(async () => {
  const jwt = getCookie(SESSION_COOKIE)
  if (!jwt) return { jwt: null }

  if (!needsRefresh(jwt)) return { jwt }

  // Sliding refresh. Any failure (network, Convex hiccup) keeps the current
  // cookie — refreshing is best-effort and must never log anyone out.
  try {
    const res = await fetchAction(api.authActions.refreshSession, {}, convexServerOptions(jwt))
    if (res?.jwt) {
      setSessionCookie(getRequest(), res.jwt)
      return { jwt: res.jwt }
    }
  } catch (err) {
    console.warn('Session refresh failed; keeping current session', err)
  }
  return { jwt }
})

// Last token seen in this tab. If the session request fails (flaky mobile
// network, phone waking up), we hand Convex this instead of `null` — returning
// null would make Convex treat the user as logged out.
let lastJwt: string | null = null

async function fetchSessionWithRetry(attempts = 3): Promise<string | null> {
  for (let i = 0; ; i++) {
    try {
      const { jwt } = await fetchSession()
      lastJwt = jwt ?? null
      return lastJwt
    } catch (err) {
      if (i >= attempts - 1) {
        if (lastJwt) return lastJwt
        throw err
      }
      await new Promise((r) => setTimeout(r, 500 * 2 ** i))
    }
  }
}

// Drives <ConvexProviderWithAuth useAuth={useVerifySpeedAuth} />. The contract is
// { isLoading, isAuthenticated, fetchAccessToken }. We probe the cookie once on
// mount to decide isAuthenticated; login/logout do a hard navigation so this hook
// re-runs with the fresh cookie rather than needing to mutate state in place.
export function useVerifySpeedAuth() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchAccessToken = useCallback(
    async (_opts?: { forceRefreshToken?: boolean }) => {
      try {
        return await fetchSessionWithRetry()
      } catch {
        return lastJwt
      }
    },
    [],
  )

  useEffect(() => {
    let active = true
    let retry: ReturnType<typeof setTimeout> | undefined

    const probe = () => {
      fetchSessionWithRetry()
        .then((jwt) => {
          if (!active) return
          setIsAuthenticated(!!jwt)
          setIsLoading(false)
        })
        .catch(() => {
          // Couldn't reach the server at all — stay "loading" and try again
          // rather than declaring the user logged out.
          if (active) retry = setTimeout(probe, 3000)
        })
    }
    probe()

    return () => {
      active = false
      if (retry) clearTimeout(retry)
    }
  }, [])

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  )
}
