import { useState, useRef, useEffect, type ReactElement } from 'react'
import { getLocale, locales, setLocale } from '@/src/paraglide/runtime'

// ── Mini flag components ───────────────────────────────────
function KurdishFlag({ size = 18 }: { size?: number }) {
  const h = Math.round(size * 0.67)
  const s = Math.round(h / 3)
  const r = Math.round(s * 0.72)
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} style={{ borderRadius: 3, display: 'block' }}>
      <rect x="0" y="0" width={size} height={s} fill="#CE1126" />
      <rect x="0" y={s} width={size} height={s} fill="#FFFFFF" />
      <rect x="0" y={s * 2} width={size} height={s} fill="#007A3D" />
      <circle cx={size / 2} cy={h / 2} r={r} fill="#F5C518" />
    </svg>
  )
}

function IraqFlag({ size = 18 }: { size?: number }) {
  const h = Math.round(size * 0.67)
  const s = Math.round(h / 3)
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} style={{ borderRadius: 3, display: 'block' }}>
      <rect x="0" y="0" width={size} height={s} fill="#CE1126" />
      <rect x="0" y={s} width={size} height={s} fill="#FFFFFF" />
      <rect x="0" y={s * 2} width={size} height={s} fill="#000000" />
      <text x={size / 2} y={s * 1.8} textAnchor="middle" fill="#007A3D" fontSize={s * 0.7} fontFamily="serif">كبر</text>
    </svg>
  )
}

function UKFlag({ size = 18 }: { size?: number }) {
  const h = Math.round(size * 0.67)
  return (
    <svg width={size} height={h} viewBox="0 0 60 40" style={{ borderRadius: 3, display: 'block' }}>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="13" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  )
}

type Lang = {
  code: (typeof locales)[number]
  name: string
  shortLabel: string
  Flag: (props: { size?: number }) => ReactElement
}

const LANGS: Lang[] = [
  { code: 'ckb', name: 'کوردی',   shortLabel: 'KU', Flag: KurdishFlag },
  { code: 'ar',  name: 'عربي',    shortLabel: 'AR', Flag: IraqFlag },
  { code: 'en',  name: 'English', shortLabel: 'EN', Flag: UKFlag },
]

export default function LocaleSwitcher() {
  const locale = getLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function switchLang(lang: Lang['code']) {
    setLocale(lang)
  }

  const current = LANGS.find((l) => l.code === locale) ?? LANGS[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Language: ${current.name}`}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 h-8 ps-1.5 pe-2 rounded-full border transition-colors ${
          open
            ? "bg-white border-[var(--color-ember-300)]"
            : "bg-white border-[var(--color-hairline)] hover:border-[var(--color-ember-300)]"
        }`}
      >
        <span className="inline-flex w-[22px] h-[22px] items-center justify-center rounded-full bg-[var(--color-cream-deep)]">
          <current.Flag size={14} />
        </span>
        <span className="text-[10.5px] font-bold tracking-[0.08em] text-[var(--color-ink-soft)] uppercase">
          {current.shortLabel}
        </span>
        <svg
          className={`w-2.5 h-2.5 text-[var(--color-ink-fade)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full end-0 mt-2 z-50 min-w-[180px] bg-white border border-[var(--color-hairline)] rounded-2xl shadow-[0_24px_56px_-20px_rgba(26,20,17,0.30)] overflow-hidden scale-in origin-top p-1"
        >
          {LANGS.map((lang) => {
            const active = lang.code === locale
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={active}
                onClick={() => {
                  switchLang(lang.code)
                  setOpen(false)
                }}
                className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-sm transition-colors text-start ${
                  active
                    ? "bg-[var(--color-ember-50)] text-[var(--color-ember-600)]"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-cream-deep)]"
                }`}
              >
                <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-[var(--color-cream-deep)] shrink-0">
                  <lang.Flag size={16} />
                </span>
                <span className="font-semibold flex-1">{lang.name}</span>
                {active && (
                  <svg className="w-4 h-4 text-[var(--color-ember-600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
