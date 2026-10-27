// Brands and the categories each one covers. This is the one place to edit:
// add a brand, or add/remove a category key from its list. Category keys must
// match the `value`s in src/lib/categories.js. Brand names stay in English in
// every language. "Other" is always offered as a brand choice in addition.
//
// The ORDER of this list is the popularity ranking, most popular first. Brand
// lists show brands with more products on the site first; brands with the same
// number of products (including none) follow this order. Move a line up or down
// to change it.
export const BRAND_CATEGORIES = {
  "Chicco": ["Stroller", "Car Seat", "Carry Cot", "Crib", "Bassinet", "Breast Pump", "High Chair", "Baby Walker", "Bouncer", "Toy", "Electronic", "Other"],
  "Joie": ["Stroller", "Car Seat", "Carry Cot", "Crib", "Bassinet", "High Chair", "Bouncer"],
  "Graco": ["Stroller", "Car Seat", "Crib", "Bassinet", "High Chair", "Bouncer", "Baby Walker"],
  "Philips Avent": ["Breast Pump", "Electronic", "Other"],
  "Tommee Tippee": ["Breast Pump", "Electronic", "Other"],
  "Fisher-Price": ["Bouncer", "Cradle", "Toy", "High Chair", "Baby Walker"],
  "Kidilo": ["Stroller", "Car Seat", "Crib", "High Chair", "Baby Walker", "Bassinet", "Cradle", "Bouncer"],
  "Mastela": ["Cradle", "Bassinet", "Bouncer", "High Chair"],
  "4baby": ["Stroller", "Car Seat", "Carry Cot", "Crib", "High Chair", "Baby Walker", "Bouncer"],
  "CAM": ["Stroller", "Car Seat", "Carry Cot", "Cradle", "Bassinet", "High Chair", "Baby Walker", "Bouncer"],
  "Momcozy": ["Breast Pump", "Electronic", "Other"],
  "Spectra": ["Breast Pump"],
  "Medela": ["Breast Pump", "Other"],
  "Lansinoh": ["Breast Pump", "Other"],
  "Dr. Brown's": ["Other", "Electronic"],
  "NUK": ["Other"],
  "IKEA": ["Crib", "Cradle", "High Chair", "Toy"],
  "Cybex": ["Stroller", "Car Seat", "Carry Cot", "High Chair", "Bouncer"],
  "Maxi-Cosi": ["Stroller", "Car Seat", "High Chair"],
  "Doona": ["Car Seat", "Stroller"],
  "Bugaboo": ["Stroller", "Carry Cot", "High Chair"],
  "Nuna": ["Stroller", "Car Seat", "Carry Cot", "Crib", "High Chair", "Bouncer"],
  "UPPAbaby": ["Stroller", "Car Seat", "Carry Cot", "Bassinet"],
  "Stokke": ["Stroller", "Crib", "High Chair", "Bouncer"],
  "Britax Römer": ["Stroller", "Car Seat"],
  "BabyBjörn": ["Bouncer", "High Chair", "Other"],
  "Peg Perego": ["Stroller", "Car Seat", "Carry Cot", "High Chair"],
  "Inglesina": ["Stroller", "Carry Cot", "High Chair"],
  "Babyzen": ["Stroller", "Carry Cot"],
  "Joolz": ["Stroller", "Carry Cot"],
  "Silver Cross": ["Stroller", "Carry Cot", "Crib"],
  "Kinderkraft": ["Stroller", "Car Seat", "High Chair", "Baby Walker", "Bouncer"],
  "Hauck": ["Stroller", "High Chair", "Crib", "Baby Walker"],
  "Mamas & Papas": ["Stroller", "Car Seat", "Crib", "High Chair", "Bouncer"],
  "VTech": ["Toy", "Electronic", "Baby Walker"],
  "Baby Brezza": ["Electronic"],
  "4moms": ["Bouncer", "Bassinet", "Crib", "High Chair"],
  "Ingenuity": ["Bouncer", "High Chair", "Baby Walker"],
  "Owlet": ["Electronic"],
  "Nanit": ["Electronic"],
  "Motorola": ["Electronic"],
  "Elvie": ["Breast Pump"],
  "Halo": ["Bassinet"],
  "Happiest Baby": ["Bassinet"],
  "Dsland": ["Stroller", "Carry Cot", "Car Seat"],
};

export const OTHER_BRAND = "Other";

// Brand logos: put a PNG (transparent, about 256 px) in src/assets/brands/,
// named after the brand in lower case with dashes, e.g. "Fisher-Price" →
// fisher-price.png, "Dr. Brown's" → dr-brown-s.png, "Britax Römer" →
// britax-romer.png. It shows up in the brand dropdown with the next deploy.
// Files are cropped to the logo's edges so wide logos can fill a short tag.
const LOGO_FILES = import.meta.glob("../assets/brands/*.png", { eager: true, import: "default" });
export function brandSlug(brand) {
  return brand.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
/** URL of the brand's logo, or null when there's no logo file for it yet. */
export function brandLogo(brand) {
  if (!brand) return null;
  return LOGO_FILES[`../assets/brands/${brandSlug(brand)}.png`] ?? null;
}

// Logos that spell out the brand name clearly; the rest are symbols, so a tag
// shows the brand name beside them.
const WORDMARK_LOGOS = new Set([
  "4baby", "baby-brezza", "babyzen", "chicco", "dr-brown-s", "dsland", "elvie", "fisher-price",
  "graco", "halo", "happiest-baby", "hauck", "ikea", "inglesina", "joie", "kidilo", "lansinoh",
  "mamas-papas", "owlet", "uppababy", "vtech",
]);
/** Whether the brand's logo reads as its name, so the name needn't be written next to it. */
export function brandLogoIsName(brand) {
  return Boolean(brand) && WORDMARK_LOGOS.has(brandSlug(brand));
}

const RANK = new Map(Object.keys(BRAND_CATEGORIES).map((brand, i) => [brand, i]));

/**
 * Most popular first: more products on the site (`counts`, brand → number)
 * first, then the ranking order above, then A to Z for unlisted brands.
 */
export function sortByPopularity(brands, counts = {}) {
  return [...brands].sort(
    (a, b) =>
      (counts[b] ?? 0) - (counts[a] ?? 0) ||
      (RANK.get(a) ?? Infinity) - (RANK.get(b) ?? Infinity) ||
      a.localeCompare(b, "en", { sensitivity: "base" }),
  );
}

/** Every brand, most popular first (without "Other"). */
export function getAllBrands(counts) {
  return sortByPopularity(Object.keys(BRAND_CATEGORIES), counts);
}

/** Brands mapped to a category, most popular first; every brand for "all" or no category. */
export function getBrandsForCategory(category, counts) {
  if (!category || category === "all") return getAllBrands(counts);
  return sortByPopularity(
    Object.keys(BRAND_CATEGORIES).filter((brand) => BRAND_CATEGORIES[brand].includes(category)),
    counts,
  );
}

/**
 * Brand choices for a product form: the category's brands, most popular first,
 * plus "Other". A brand the product already has is kept as a choice even if it
 * is not mapped, so editing an older product never loses its brand.
 */
export function getBrandChoices(category, currentBrand, counts) {
  const list = getBrandsForCategory(category);
  if (currentBrand && currentBrand !== OTHER_BRAND && !list.includes(currentBrand)) list.push(currentBrand);
  return [...sortByPopularity(list, counts), OTHER_BRAND];
}

/** Whether a brand fits a category ("Other" fits every category). */
export function brandFitsCategory(brand, category) {
  if (!brand || brand === OTHER_BRAND || !category || category === "all") return true;
  return (BRAND_CATEGORIES[brand] ?? []).includes(category);
}
