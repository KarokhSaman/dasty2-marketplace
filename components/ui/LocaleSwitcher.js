"use client";
import { useState, useRef, useEffect } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";

// ── Mini flag components ───────────────────────────────────
function KurdishFlag({ size = 20 }) {
  const h = Math.round(size * 0.67);
  const s = Math.round(h / 3);
  const r = Math.round(s * 0.72);
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} style={{ borderRadius: 3, display: "block" }}>
      <rect x="0" y="0"       width={size} height={s}   fill="#CE1126" />
      <rect x="0" y={s}       width={size} height={s}   fill="#FFFFFF" />
      <rect x="0" y={s * 2}   width={size} height={s}   fill="#007A3D" />
      <circle cx={size / 2} cy={h / 2} r={r} fill="#F5C518" />
    </svg>
  );
}

function IraqFlag({ size = 20 }) {
  const h = Math.round(size * 0.67);
  const s = Math.round(h / 3);
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} style={{ borderRadius: 3, display: "block" }}>
      <rect x="0" y="0"     width={size} height={s}   fill="#CE1126" />
      <rect x="0" y={s}     width={size} height={s}   fill="#FFFFFF" />
      <rect x="0" y={s * 2} width={size} height={s}   fill="#000000" />
      <text x={size / 2} y={s * 1.8} textAnchor="middle" fill="#007A3D" fontSize={s * 0.7} fontFamily="serif">كبر</text>
    </svg>
  );
}

function UKFlag({ size = 20 }) {
  const h = Math.round(size * 0.67);
  return (
    <svg width={size} height={h} viewBox="0 0 60 40" style={{ borderRadius: 3, display: "block" }}>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="13" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  );
}

// ── Language config ────────────────────────────────────────
const LANGS = [
  { code: "ckb", name: "کوردی",  Flag: KurdishFlag },
  { code: "ar",  name: "عربي",   Flag: IraqFlag },
  { code: "en",  name: "English", Flag: UKFlag },
];

export default function LocaleSwitcher() {
  const { locale } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function switchLang(lang) {
    document.cookie = `dasty2-lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  const current = LANGS.find((l) => l.code === locale) ?? LANGS[0];
  const others  = LANGS.filter((l) => l.code !== locale);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-rose-300 transition-colors"
      >
        <current.Flag size={20} />
        <span className="text-sm font-medium text-gray-700 hidden sm:block">{current.name}</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full end-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden min-w-[130px]">
          {others.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { switchLang(lang.code); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-start"
            >
              <lang.Flag size={20} />
              <span className="font-medium">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
