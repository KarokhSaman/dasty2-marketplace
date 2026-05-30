const R2_BASE = (import.meta.env.VITE_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
const icon = (name) => `${R2_BASE}/categories/${name}`;

export const CATEGORY_CONFIG = [
  {
    value: "all",
    labels: { ckb: "هەموو", ar: "الكل", en: "All" },
    bg: "bg-white",
    img: icon("all.png"),
  },
  {
    value: "Strollers & Travel",
    labels: { ckb: "ستارۆلەر", ar: "العربات", en: "Strollers" },
    bg: "bg-white",
    img: icon("strollers.png"),
  },
  {
    value: "Car Seats",
    labels: { ckb: "كورسی ئۆتۆمبێل", ar: "مقعد سيارة", en: "Car Seats" },
    bg: "bg-white",
    img: icon("carseats.png"),
  },
  {
    value: "Carry Cot",
    labels: { ckb: "سەبەت", ar: "سرير محمول", en: "Carry Cot" },
    bg: "bg-white",
    img: icon("carry-cot.png"),
  },
  {
    value: "Bed",
    labels: { ckb: "جێوار", ar: "سرير", en: "Bed" },
    bg: "bg-white",
    img: icon("bed.png"),
  },
  {
    value: "Feeding & Nursing",
    labels: { ckb: "خواردن و شیردان", ar: "التغذية", en: "Feeding" },
    bg: "bg-white",
    img: icon("feeding.png"),
  },
  {
    value: "Bouncers & Swings",
    labels: { ckb: "جوولانە", ar: "الأرجوحة", en: "Bouncers" },
    bg: "bg-white",
    img: icon("bouncers.png"),
  },
  {
    value: "High Chairs",
    labels: { ckb: "كورسی بەرز", ar: "كرسي عالٍ", en: "High Chairs" },
    bg: "bg-white",
    img: icon("highchairs.png"),
  },
  {
    value: "Toys & Play",
    labels: { ckb: "یارییەکان", ar: "الألعاب", en: "Toys" },
    bg: "bg-white",
    img: icon("toys.png"),
  },
  {
    value: "Electronics & Monitors",
    labels: { ckb: "ئامیرۆكان", ar: "الإلكترونيات", en: "Electronics" },
    bg: "bg-white",
    img: icon("electronics.png"),
  },
  {
    value: "Other",
    labels: { ckb: "تر", ar: "أخرى", en: "Other" },
    bg: "bg-white",
    img: icon("other.png"),
  },
];

export function getCategoryLabel(category, locale) {
  const config = CATEGORY_CONFIG.find(c => c.value === category);
  return config?.labels?.[locale] ?? config?.labels?.en ?? category;
}

// Returns all locale labels for a category — used to make search work in any language
export function getCategorySearchStrings(category) {
  const config = CATEGORY_CONFIG.find(c => c.value === category);
  if (!config) return [category.toLowerCase()];
  return Object.values(config.labels).map(s => s.toLowerCase());
}
