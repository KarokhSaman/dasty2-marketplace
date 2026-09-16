// Phone helpers for the VerifySpeed OTP login. VerifySpeed requires E.164
// (`+<country><number>`); sellers type a local Iraqi number like 07XXXXXXXXX.

export const DEFAULT_DIAL_CODE = '+964' // Iraq

// Country dial codes. Iraq first (default market). Shows flag + code for compact display.
export const DIAL_CODES: Array<{ code: string; label: string }> = [
  // Middle East
  { code: '+964', label: '🇮🇶 +964' },
  { code: '+966', label: '🇸🇦 +966' },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+965', label: '🇰🇼 +965' },
  { code: '+968', label: '🇴🇲 +968' },
  { code: '+974', label: '🇶🇦 +974' },
  { code: '+973', label: '🇧🇭 +973' },
  { code: '+972', label: '🇵🇸 +972' },
  { code: '+962', label: '🇯🇴 +962' },
  { code: '+963', label: '🇸🇾 +963' },
  { code: '+961', label: '🇱🇧 +961' },
  // Africa
  { code: '+20', label: '🇪🇬 +20' },
  { code: '+212', label: '🇲🇦 +212' },
  { code: '+216', label: '🇹🇳 +216' },
  // Europe
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+33', label: '🇫🇷 +33' },
  { code: '+49', label: '🇩🇪 +49' },
  { code: '+39', label: '🇮🇹 +39' },
  { code: '+34', label: '🇪🇸 +34' },
  { code: '+31', label: '🇳🇱 +31' },
  { code: '+41', label: '🇨🇭 +41' },
  { code: '+43', label: '🇦🇹 +43' },
  { code: '+45', label: '🇩🇰 +45' },
  { code: '+46', label: '🇸🇪 +46' },
  { code: '+47', label: '🇳🇴 +47' },
  { code: '+358', label: '🇫🇮 +358' },
  { code: '+48', label: '🇵🇱 +48' },
  // Americas
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+1', label: '🇨🇦 +1' },
  { code: '+52', label: '🇲🇽 +52' },
  { code: '+55', label: '🇧🇷 +55' },
  { code: '+54', label: '🇦🇷 +54' },
  // Asia
  { code: '+86', label: '🇨🇳 +86' },
  { code: '+81', label: '🇯🇵 +81' },
  { code: '+82', label: '🇰🇷 +82' },
  { code: '+91', label: '🇮🇳 +91' },
  { code: '+60', label: '🇲🇾 +60' },
  { code: '+65', label: '🇸🇬 +65' },
  { code: '+66', label: '🇹🇭 +66' },
  { code: '+62', label: '🇮🇩 +62' },
]

// OTP delivery methods
export const OTP_METHODS: Array<{ id: string; label: string; icon: string }> = [
  { id: 'whatsapp-otp', label: 'WhatsApp', icon: '💬' },
  { id: 'sms-otp', label: 'SMS', icon: '📱' },
  { id: 'telegram-otp', label: 'Telegram', icon: '✈️' },
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
