import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { useCallback, useEffect, useMemo, useState } from 'react'

// The session cookie holds the RS256 JWT minted by convex/authActions.verifyOtp.
// It is httpOnly, so the browser can only read it back through this server fn —
// which is exactly what ConvexProviderWithAuth needs for its access token.
export const SESSION_COOKIE = 'dasty2-session'

export const fetchSession = createServerFn({ method: 'GET' }).handler(async () => {
  const jwt = getCookie(SESSION_COOKIE)
  return { jwt: jwt ?? null }
})

// Drives <ConvexProviderWithAuth useAuth={useVerifySpeedAuth} />. The contract is
// { isLoading, isAuthenticated, fetchAccessToken }. We probe the cookie once on
// mount to decide isAuthenticated; login/logout do a hard navigation so this hook
// re-runs with the fresh cookie rather than needing to mutate state in place.
export function useVerifySpeedAuth() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchAccessToken = useCallback(
    async (_opts?: { forceRefreshToken?: boolean }) => {
      const { jwt } = await fetchSession()
      return jwt ?? null
    },
    [],
  )

  useEffect(() => {
    let active = true
    fetchSession()
      .then(({ jwt }) => {
        if (!active) return
        setIsAuthenticated(!!jwt)
        setIsLoading(false)
      })
      .catch(() => {
        if (!active) return
        setIsAuthenticated(false)
        setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  )
}
