import { createServerFn } from '@tanstack/react-start'
import { getCookie, getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { fetchAction } from 'convex/nextjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useConvexAuth } from 'convex/react'
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
  // Per-user answer: never let a browser or proxy replay an old one.
  setResponseHeader('Cache-Control', 'private, no-store')
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
      // Sign-out is always a full page load, so an empty answer while this
      // tab holds a session is a glitch — keep the session we have.
      lastJwt = jwt ?? lastJwt
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

// Builds the hook for <ConvexProviderWithAuth useAuth={...} />. The contract is
// { isLoading, isAuthenticated, fetchAccessToken }. `initialJwt` is the session
// the server already read while rendering the page (undefined if unknown). With
// it, auth is known on the first render and Convex gets the token at once, so
// the page doesn't wait on an extra session request before logging in. Without
// it we probe the cookie once on mount. Login/logout do a hard navigation, so
// this re-runs with the fresh cookie rather than mutating state in place.
export function createVerifySpeedAuth(initialJwt?: string | null) {
  const known = initialJwt !== undefined
  // Browser only: on the server this module is shared by every request.
  if (known && typeof window !== 'undefined') lastJwt = initialJwt ?? null
  return function useVerifySpeedAuth() {
    return useVerifySpeedAuthState(known, !!initialJwt)
  }
}

// Set while the auth hook is mounted: asks Convex to log in again from scratch.
let restartConvexAuth: (() => void) | null = null

/** Whether this tab holds a session (the user is signed in, as far as we know). */
export function hasSessionToken() {
  return typeof window !== 'undefined' && !!lastJwt
}

function useVerifySpeedAuthState(known: boolean, initiallyAuthenticated: boolean) {
  const [isLoading, setIsLoading] = useState(!known)
  const [isAuthenticated, setIsAuthenticated] = useState(initiallyAuthenticated)
  // A new fetchAccessToken makes ConvexProviderWithAuth call client.setAuth
  // again, which re-sends the token even if it is the same one.
  const [authAttempt, setAuthAttempt] = useState(0)

  useEffect(() => {
    restartConvexAuth = () => setAuthAttempt((n) => n + 1)
    return () => {
      restartConvexAuth = null
    }
  }, [])

  const fetchAccessToken = useCallback(
    async (opts?: { forceRefreshToken?: boolean }) => {
      // The token from the page is fresh; only go back to the server when
      // Convex asks for a new one (expired or rejected).
      if (!opts?.forceRefreshToken && lastJwt) return lastJwt
      try {
        return await fetchSessionWithRetry()
      } catch {
        return lastJwt
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authAttempt],
  )

  useEffect(() => {
    if (known) return
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
  }, [known])

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  )
}

// When the Convex server rejects the token once (e.g. a hiccup verifying it),
// the client fetches it again, gets the same token back, and gives up — the
// tab then looks signed out until a full reload, although the session cookie
// is fine. While we still hold a session, keep asking Convex to log in again:
// soon, then less often, and at once when the phone is back online or the
// tab is in front again. Must be used inside ConvexProviderWithAuth.
const RETRY_DELAYS_MS = [1000, 3000, 10000, 30000, 60000]

export function useKeepConvexAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const lost = !isLoading && !isAuthenticated && hasSessionToken()
  const attempts = useRef(0)

  useEffect(() => {
    if (isAuthenticated) attempts.current = 0
  }, [isAuthenticated])

  useEffect(() => {
    if (!lost) return
    const delay = RETRY_DELAYS_MS[Math.min(attempts.current, RETRY_DELAYS_MS.length - 1)]
    const retry = () => {
      attempts.current++
      restartConvexAuth?.()
    }
    const timer = setTimeout(retry, delay)
    const retryNow = () => {
      if (document.visibilityState === 'visible') retry()
    }
    window.addEventListener('online', retryNow)
    document.addEventListener('visibilitychange', retryNow)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('online', retryNow)
      document.removeEventListener('visibilitychange', retryNow)
    }
  }, [lost])
}
