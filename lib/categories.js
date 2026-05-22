export const CATEGORY_CONFIG = [
  {
    value: "all",
    labels: { ckb: "هەموو", ar: "الكل", en: "All" },
    bg: "bg-white",
    img: "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138342/all_xeokol.png",
  },
  {
    value: "Strollers & Travel",
    labels: { ckb: "ستارۆلەر", ar: "العربات", en: "Strollers" },
    bg: "bg-white",
    img: "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/strollers_mr5mhk.png",
  },
  {
    value: "Car Seats",
    labels: { ckb: "كورسی ئۆتۆمبێل", ar: "مقعد سيارة", en: "Car Seats" },
    bg: "bg-white",
    img: "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138358/carseats_lpxcga.png",
  },
  {
    value: "Carry Cot",
    labels: { ckb: "سەبەت", ar: "سرير محمول", en: "Carry Cot" },
    bg: "bg-white",
    img: "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138358/Carry_Cot_y7yace.png",
  },
  {
    value: "Bed",
    labels: { ckb: "جێوار", ar: "سرير", en: "Bed" },
    bg: "bg-white",
    img: "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138358/Bed_ouycjy.png",
  },
  {
    value: "Feeding & Nursing",
    labels: { ckb: "خواردن و شیردان", ar: "التغذية", en: "Feeding" },
    bg: "bg-white",
    img: "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/feeding_aoipl9.png",
  },
  {
    value: "Bouncers & Swings",
    labels: { ckb: "جوولانە", ar: "الأرجوحة", en: "Bouncers" },
    bg: "bg-white",
    img: "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779141106/bouncers_wrha1c.png",
  },
  {
    value: "High Chairs",
    labels: { ckb: "كورسی بەرز", ar: "كرسي عالٍ", en: "High Chairs" },
    bg: "bg-white",
    img: "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138342/highchairs_erlg5h.png",
  },
  {
    value: "Toys & Play",
    labels: { ckb: "یارییەکان", ar: "الألعاب", en: "Toys" },
    bg: "bg-white",
    img: "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/toys_dziew5.png",
  },
  {
    value: "Electronics & Monitors",
    labels: { ckb: "ئامیرۆكان", ar: "الإلكترونيات", en: "Electronics" },
    bg: "bg-white",
    img: "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/electronics_qqj0mi.png",
  },
  {
    value: "Other",
    labels: { ckb: "تر", ar: "أخرى", en: "Other" },
    bg: "bg-white",
    img: "https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779141105/Other_jq5gok.png",
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
