export const IRAQ_CITIES = [
  // Kurdistan Region
  "Erbil",
  "Sulaymaniyah",
  "Duhok",
  "Halabja",
  "Zakho",
  "Soran",
  "Shaqlawa",
  "Koya",
  "Ranya",
  "Kalar",
  "Chamchamal",
  "Penjwin",
  "Akre",
  "Amadiya",
  "Darbandikhan",
  "Kifri",
  // Rest of Iraq
  "Baghdad",
  "Basra",
  "Mosul",
  "Kirkuk",
  "Najaf",
  "Karbala",
  "Nasiriyah",
  "Amarah",
  "Diwaniyah",
  "Hillah",
  "Kut",
  "Ramadi",
  "Tikrit",
  "Fallujah",
  "Samarra",
  "Baqubah",
  "Khanaqin",
  "Sinjar",
  "Tal Afar",
  "Haditha",
  "Tuz Khurmatu",
];

export const CITY_LABELS = {
  // Kurdistan Region
  "Erbil":         { ckb: "هەولێر",       ar: "أربيل",        en: "Erbil" },
  "Sulaymaniyah":  { ckb: "سلێمانی",      ar: "السليمانية",   en: "Sulaymaniyah" },
  "Duhok":         { ckb: "دهۆک",          ar: "دهوك",         en: "Duhok" },
  "Halabja":       { ckb: "هەڵەبجە",      ar: "حلبجة",        en: "Halabja" },
  "Zakho":         { ckb: "زاخۆ",          ar: "زاخو",         en: "Zakho" },
  "Soran":         { ckb: "سۆران",         ar: "سوران",        en: "Soran" },
  "Shaqlawa":      { ckb: "شەقڵاوە",      ar: "شقلاوة",       en: "Shaqlawa" },
  "Koya":          { ckb: "کۆیە",          ar: "كويه",         en: "Koya" },
  "Ranya":         { ckb: "ڕانیە",         ar: "رانية",        en: "Ranya" },
  "Kalar":         { ckb: "کەلار",         ar: "كلار",         en: "Kalar" },
  "Chamchamal":    { ckb: "چەمچەماڵ",     ar: "جمجمال",       en: "Chamchamal" },
  "Penjwin":       { ckb: "پەنجوێن",      ar: "بنجوين",       en: "Penjwin" },
  "Akre":          { ckb: "ئەکرێ",         ar: "عقرة",         en: "Akre" },
  "Amadiya":       { ckb: "ئامێدی",        ar: "العمادية",     en: "Amadiya" },
  "Darbandikhan":  { ckb: "دەربەندیخان",  ar: "دربنديخان",    en: "Darbandikhan" },
  "Kifri":         { ckb: "کفری",          ar: "كفري",         en: "Kifri" },
  // Rest of Iraq
  "Baghdad":       { ckb: "بەغداد",        ar: "بغداد",        en: "Baghdad" },
  "Basra":         { ckb: "بەسرە",         ar: "البصرة",       en: "Basra" },
  "Mosul":         { ckb: "موسڵ",          ar: "الموصل",       en: "Mosul" },
  "Kirkuk":        { ckb: "کەرکووک",      ar: "كركوك",        en: "Kirkuk" },
  "Najaf":         { ckb: "نەجەف",         ar: "النجف",        en: "Najaf" },
  "Karbala":       { ckb: "کەربەلا",      ar: "كربلاء",       en: "Karbala" },
  "Nasiriyah":     { ckb: "ناسریە",        ar: "الناصرية",     en: "Nasiriyah" },
  "Amarah":        { ckb: "عەمارە",        ar: "العمارة",      en: "Amarah" },
  "Diwaniyah":     { ckb: "دیوانیە",       ar: "الديوانية",    en: "Diwaniyah" },
  "Hillah":        { ckb: "حلە",           ar: "الحلة",        en: "Hillah" },
  "Kut":           { ckb: "کوت",           ar: "الكوت",        en: "Kut" },
  "Ramadi":        { ckb: "ڕەمادی",        ar: "الرمادي",      en: "Ramadi" },
  "Tikrit":        { ckb: "تکریت",         ar: "تكريت",        en: "Tikrit" },
  "Fallujah":      { ckb: "فەللووجە",     ar: "الفلوجة",      en: "Fallujah" },
  "Samarra":       { ckb: "سامەڕا",        ar: "سامراء",       en: "Samarra" },
  "Baqubah":       { ckb: "بەعقووبە",     ar: "بعقوبة",       en: "Baqubah" },
  "Khanaqin":      { ckb: "خانەقین",      ar: "خانقين",       en: "Khanaqin" },
  "Sinjar":        { ckb: "شنگال",         ar: "سنجار",        en: "Sinjar" },
  "Tal Afar":      { ckb: "تەلعەفەر",     ar: "تلعفر",        en: "Tal Afar" },
  "Haditha":       { ckb: "حەدیسە",       ar: "حديثة",        en: "Haditha" },
  "Tuz Khurmatu":  { ckb: "تووزخورماتۆ", ar: "طوزخورماتو",   en: "Tuz Khurmatu" },
};

export function getCityOptions(locale) {
  return IRAQ_CITIES.map(city => ({
    value: city,
    label: CITY_LABELS[city]?.[locale] ?? city,
  }));
}

export function getCityLabel(city, locale) {
  return CITY_LABELS[city]?.[locale] ?? city;
}
