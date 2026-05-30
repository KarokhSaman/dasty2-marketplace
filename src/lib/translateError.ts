import * as m from '@/paraglide/messages'

// Backend (API routes + Convex throws) returns stable snake_case codes.
// Unknown / missing codes fall back to a generic message.
export function translateError(code: unknown): string {
  switch (code) {
    case 'not_admin':
      return m.adminEmailNotRegistered()
    case 'missing_fields':
      return m.errMissingFields()
    case 'email_required':
      return m.errEmailRequired()
    case 'code_expired':
      return m.errCodeExpired()
    case 'code_invalid':
      return m.errCodeInvalid()
    case 'account_inactive':
      return m.errAccountInactive()
    case 'session_expired':
      return m.errSessionExpired()
    case 'unauthorized':
      return m.errUnauthorized()
    case 'no_file':
      return m.errNoFile()
    default:
      return m.errorGeneral()
  }
}
