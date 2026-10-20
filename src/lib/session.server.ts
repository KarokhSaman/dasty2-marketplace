import { setCookie } from '@tanstack/react-start/server'
import { secureCookieOptions } from '@/lib/security'
import { SESSION_COOKIE } from '@/lib/session'

// 400 days — the longest lifetime browsers allow for a cookie. Combined with the
// sliding refresh in fetchSession, a user is only logged out by tapping
// "Log out", by an admin deactivating the account, or by not opening the app
// for 400 days.
export const SESSION_MAX_AGE = 400 * 24 * 60 * 60

export function setSessionCookie(request: Request, jwt: string) {
  setCookie(SESSION_COOKIE, jwt, {
    ...secureCookieOptions(request),
    maxAge: SESSION_MAX_AGE,
  })
}
