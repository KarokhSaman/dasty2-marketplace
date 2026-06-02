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
    labels: { ckb: "عارەبانە", ar: "عربات الأطفال", en: "Strollers" },
    bg: "bg-white",
    img: icon("strollers.png"),
  },
  {
    value: "Car Seats",
    labels: { ckb: "کورسی ئۆتۆمبێل", ar: "مقاعد السيارات", en: "Car Seats" },
    bg: "bg-white",
    img: icon("carseats.png"),
  },
  {
    value: "Carry Cot",
    labels: { ckb: "كاری كۆت", ar: "سرير محمول (كاري كوت)", en: "Carry Cot" },
    bg: "bg-white",
    img: icon("carry-cot.png"),
  },
  {
    value: "Bed",
    labels: { ckb: "سیسەم", ar: "أسرة وأرائك", en: "Bed" },
    bg: "bg-white",
    img: icon("bed.png"),
  },
  {
    value: "Feeding & Nursing",
    labels: { ckb: "شیردان", ar: "مستلزمات التغذية والرضاعة", en: "Feeding" },
    bg: "bg-white",
    img: icon("feeding.png"),
  },
  {
    value: "Bouncers & Swings",
    labels: { ckb: "جۆلانه", ar: "هزازات وأرجوحات", en: "Bouncers" },
    bg: "bg-white",
    img: icon("bouncers.png"),
  },
  {
    value: "High Chairs",
    labels: { ckb: "کورسی نانخواردن", ar: "كراسي طعام عالية", en: "High Chairs" },
    bg: "bg-white",
    img: icon("highchairs.png"),
  },
  {
    value: "Toys & Play",
    labels: { ckb: "یارییەکان", ar: "الألعاب والترفيه", en: "Toys" },
    bg: "bg-white",
    img: icon("toys.png"),
  },
  {
    value: "Electronics & Monitors",
    labels: { ckb: "ئامێرە ئەلیکترۆنییەکان", ar: "الأجهزة الإلكترونية والمراقبة", en: "Electronics" },
    bg: "bg-white",
    img: icon("electronics.png"),
  },
  {
    value: "Other",
    labels: { ckb: "کۆمەڵەی تر", ar: "أخرى / أخرى", en: "Other" },
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