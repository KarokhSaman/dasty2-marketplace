// Locale-aware date formatting that does NOT depend on the runtime's ICU data.
//
// `toLocaleDateString("ckb" | "ar", …)` is not portable here: workerd ships a
// trimmed ICU with English data only, so the Worker renders "May 23, 2026"
// while the browser renders "٢٣ی ئایاری ٢٠٢٦" — a hydration mismatch that makes
// React throw away and re-render the subtree on every non-English product page.
// Formatting from our own tables keeps server and client byte-identical.

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ckb: [
    "کانوونی دووەم", "شوبات", "ئازار", "نیسان", "ئایار", "حوزەیران",
    "تەمووز", "ئاب", "ئەیلوول", "تشرینی یەکەم", "تشرینی دووەم", "کانوونی یەکەم",
  ],
  ar: [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ],
};

const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

// ckb/ar render dates in Arabic-Indic digits — matching what the browser used
// to produce, so the visible output does not change for those locales.
function digits(n, locale) {
  const s = String(n);
  if (locale === "en") return s;
  return s.replace(/\d/g, (d) => ARABIC_INDIC[Number(d)]);
}

/**
 * Format an ISO date in the active locale.
 *
 * Iraq is a fixed UTC+3 (no DST), so we shift by +3h and read the UTC calendar
 * fields — workerd has no named-timezone data, and this keeps the calendar date
 * identical on both sides.
 *
 *   en  → "23 May 2026"
 *   ckb → "٢٣ی ئایاری ٢٠٢٦"
 *   ar  → "٢٣ مايو ٢٠٢٦"
 */
export function formatDate(iso, locale = "en") {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso).slice(0, 10);

  const local = new Date(parsed.getTime() + 3 * 60 * 60 * 1000);
  const months = MONTHS[locale] ?? MONTHS.en;
  const day = local.getUTCDate();
  const month = months[local.getUTCMonth()];
  const year = local.getUTCFullYear();

  if (locale === "ckb") return `${digits(day, locale)}ی ${month}ی ${digits(year, locale)}`;
  if (locale === "ar") return `${digits(day, locale)} ${month} ${digits(year, locale)}`;
  return `${day} ${month} ${year}`;
}

export default formatDate;
