// Phone helpers for the VerifySpeed OTP login. VerifySpeed requires E.164
// (`+<country><number>`); sellers type a local Iraqi number like 07XXXXXXXXX.

export const DEFAULT_DIAL_CODE = '+964' // Iraq

// Country dial codes. Iraq first (default market).
export const DIAL_CODES: Array<{ code: string; label: string }> = [
  // Middle East
  { code: '+964', label: '🇮🇶 Iraq' },
  { code: '+966', label: '🇸🇦 Saudi Arabia' },
  { code: '+971', label: '🇦🇪 UAE' },
  { code: '+965', label: '🇰🇼 Kuwait' },
  { code: '+968', label: '🇴🇲 Oman' },
  { code: '+974', label: '🇶🇦 Qatar' },
  { code: '+973', label: '🇧🇭 Bahrain' },
  { code: '+972', label: '🇵🇸 Palestine' },
  { code: '+962', label: '🇯🇴 Jordan' },
  { code: '+963', label: '🇸🇾 Syria' },
  { code: '+961', label: '🇱🇧 Lebanon' },
  // Africa
  { code: '+20', label: '🇪🇬 Egypt' },
  { code: '+212', label: '🇲🇦 Morocco' },
  { code: '+216', label: '🇹🇳 Tunisia' },
  // Europe
  { code: '+44', label: '🇬🇧 UK' },
  { code: '+33', label: '🇫🇷 France' },
  { code: '+49', label: '🇩🇪 Germany' },
  { code: '+39', label: '🇮🇹 Italy' },
  { code: '+34', label: '🇪🇸 Spain' },
  { code: '+31', label: '🇳🇱 Netherlands' },
  { code: '+41', label: '🇨🇭 Switzerland' },
  { code: '+43', label: '🇦🇹 Austria' },
  { code: '+45', label: '🇩🇰 Denmark' },
  { code: '+46', label: '🇸🇪 Sweden' },
  { code: '+47', label: '🇳🇴 Norway' },
  { code: '+358', label: '🇫🇮 Finland' },
  { code: '+48', label: '🇵🇱 Poland' },
  // Americas
  { code: '+1', label: '🇺🇸 USA/Canada' },
  { code: '+52', label: '🇲🇽 Mexico' },
  { code: '+55', label: '🇧🇷 Brazil' },
  { code: '+54', label: '🇦🇷 Argentina' },
  // Asia
  { code: '+86', label: '🇨🇳 China' },
  { code: '+81', label: '🇯🇵 Japan' },
  { code: '+82', label: '🇰🇷 South Korea' },
  { code: '+91', label: '🇮🇳 India' },
  { code: '+60', label: '🇲🇾 Malaysia' },
  { code: '+65', label: '🇸🇬 Singapore' },
  { code: '+66', label: '🇹🇭 Thailand' },
  { code: '+62', label: '🇮🇩 Indonesia' },
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
