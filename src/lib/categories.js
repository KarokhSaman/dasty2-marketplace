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
    labels: { ckb: "عارەبانە", ar: "عربات الأطفال", en: "Stroller" },
    bg: "bg-white",
    img: icon("strollers.png"),
  },
  {
    value: "Car Seats",
    labels: { ckb: "کورسی ئۆتۆمبێل", ar: "مقاعد السيارات", en: "Car Seat" },
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
    value: "Crib",
    labels: { ckb: "سیسەم", ar: "سرير أطفال", en: "Crib" },
    bg: "bg-white",
    img: icon("bed.png"),
  },
  {
    value: "Cradle",
    labels: { ckb: "لانک", ar: "هزاز الأطفال", en: "Cradle" },
    bg: "bg-white",
    img: icon("cradle.png"),
  },
  {
    value: "Bassinet",
    labels: { ckb: "جێخەو", ar: "سرير الأطفال الصغير", en: "Bassinet" },
    bg: "bg-white",
    img: icon("bassinet.png"),
  },
  {
    value: "Breast Pump",
    labels: { ckb: "شیردۆش", ar: "شفاط الحليب", en: "Breast Pump" },
    bg: "bg-white",
    img: icon("feeding.png"),
  },
  {
    value: "Bouncers & Swings",
    labels: { ckb: "جۆلانه", ar: "هزازات وأرجوحات", en: "Bouncer" },
    bg: "bg-white",
    img: icon("bouncers.png"),
  },
  {
    value: "High Chairs",
    labels: { ckb: "کورسی نانخواردن", ar: "كراسي طعام عالية", en: "High Chair" },
    bg: "bg-white",
    img: icon("highchairs.png"),
  },
  {
    value: "Baby Walker",
    labels: { ckb: "پێگرە / ڕەوڕەوە", ar: "مشاية الأطفال", en: "Baby Walker" },
    bg: "bg-white",
    img: icon("baby-walker.png"),
  },
  {
    value: "Toys & Play",
    labels: { ckb: "یارییەکان", ar: "الألعاب والترفيه", en: "Toy" },
    bg: "bg-white",
    img: icon("toys.png"),
  },
  {
    value: "Electronics & Monitors",
    labels: { ckb: "ئامێرە ئەلیکترۆنییەکان", ar: "الأجهزة الإلكترونية والمراقبة", en: "Electronic" },
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