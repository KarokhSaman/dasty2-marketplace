import { IRAQ_CITIES } from '@/lib/cities'

// Turns a city name from Cloudflare's IP data into one of our city values
// (IRAQ_CITIES), allowing for other spellings. Unknown names give null.

const key = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^(as|al|ad|an|ar|ash|at|az)[\s-]+/, '')
    .replace(/[^a-z]/g, '')

// Other spellings Cloudflare's data may use for our cities.
const ALIASES: Record<string, string> = {
  arbil: 'Erbil',
  irbil: 'Erbil',
  hawler: 'Erbil',
  hewler: 'Erbil',
  sulaimaniyah: 'Sulaymaniyah',
  sulaimaniya: 'Sulaymaniyah',
  sulaymaniya: 'Sulaymaniyah',
  slemani: 'Sulaymaniyah',
  silemani: 'Sulaymaniyah',
  dahuk: 'Duhok',
  dohuk: 'Duhok',
  halabjah: 'Halabja',
  zakhu: 'Zakho',
  koysinjaq: 'Koya',
  koye: 'Koya',
  rania: 'Ranya',
  rawanduz: 'Soran',
  diana: 'Soran',
  aqrah: 'Akre',
  akra: 'Akre',
  amadiyah: 'Amadiya',
  amedi: 'Amadiya',
  basrah: 'Basra',
  mawsil: 'Mosul',
  nasiriya: 'Nasiriyah',
  amara: 'Amarah',
  diwaniya: 'Diwaniyah',
  hilla: 'Hillah',
  baqubah: 'Baqubah',
  baqouba: 'Baqubah',
  tallafar: 'Tal Afar',
  tuzkhurmatu: 'Tuz Khurmatu',
}

const BY_KEY = new Map<string, string>(IRAQ_CITIES.map((c: string) => [key(c), c]))

export function matchCity(raw: string | undefined | null): string | null {
  if (!raw) return null
  const k = key(raw)
  return BY_KEY.get(k) ?? ALIASES[k] ?? null
}

// Kurdistan Region cities are listed first in IRAQ_CITIES, before Baghdad.
// Kirkuk is counted with them for the site's language.
const FIRST_IRAQ_CITY = 'Baghdad'
const KURDISH_CITIES = new Set<string>([
  ...IRAQ_CITIES.slice(0, IRAQ_CITIES.indexOf(FIRST_IRAQ_CITY)),
  'Kirkuk',
])

// ISO 3166-2 codes Cloudflare reports in `regionCode`: Erbil, Sulaymaniyah,
// Duhok, Halabja, and Kirkuk.
const KURDISH_REGION_CODES = new Set(['AR', 'SU', 'DA', 'HA', 'KI'])

type CfLocation = { country?: string; continent?: string; region?: string; regionCode?: string; city?: string }

/** Whether Cloudflare's location is in the Kurdistan Region or Kirkuk. */
export function isKurdishArea(cf: CfLocation | undefined): boolean {
  if (!cf || cf.country !== 'IQ') return false
  if (cf.regionCode && KURDISH_REGION_CODES.has(cf.regionCode)) return true
  const fromRegion = matchCity(cf.region)
  const fromCity = matchCity(cf.city)
  return (!!fromRegion && KURDISH_CITIES.has(fromRegion)) || (!!fromCity && KURDISH_CITIES.has(fromCity))
}

// Continents (Cloudflare `continent`) that get English: Europe, North and
// South America.
const ENGLISH_CONTINENTS = new Set(['EU', 'NA', 'SA'])

/**
 * The language for a visitor's first visit, from Cloudflare's location:
 * Kurdish in the Kurdistan Region and Kirkuk, English in Europe and the
 * Americas, Arabic everywhere else.
 */
export function firstVisitLanguage(cf: CfLocation): 'ckb' | 'en' | 'ar' {
  if (isKurdishArea(cf)) return 'ckb'
  if (cf.continent && ENGLISH_CONTINENTS.has(cf.continent)) return 'en'
  return 'ar'
}
