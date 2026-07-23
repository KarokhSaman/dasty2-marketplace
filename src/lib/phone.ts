// Phone helpers for the VerifySpeed OTP login. VerifySpeed requires E.164
// (`+<country><number>`); sellers type a local Iraqi number like 07XXXXXXXXX.

export const DEFAULT_DIAL_CODE = '+964' // Iraq

// Common dial codes for the country picker. Iraq first (default market).
export const DIAL_CODES: Array<{ code: string; label: string }> = [
  { code: '+964', label: '🇮🇶 +964' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+49', label: '🇩🇪 +49' },
  { code: '+90', label: '🇹🇷 +90' },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+98', label: '🇮🇷 +98' },
]

// Combine a selected dial code with a locally-typed number into E.164.
// Strips non-digits, drops a single leading trunk 0 (Iraqi mobiles: 07.. → 7..).
export function toE164(dialCode: string, local: string): string {
  const digits = local.replace(/\D/g, '').replace(/^0+/, '')
  const cc = dialCode.replace(/[^\d+]/g, '')
  return `${cc.startsWith('+') ? cc : `+${cc}`}${digits}`
}

// Loose sanity check — enough digits to be a real number, not full validation
// (VerifySpeed is the source of truth once the code is sent).
export function isPlausiblePhone(dialCode: string, local: string): boolean {
  const digits = local.replace(/\D/g, '').replace(/^0+/, '')
  return digits.length >= 6 && digits.length <= 14
}
