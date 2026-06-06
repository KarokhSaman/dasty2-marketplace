// Brands available for baby product categories
// These brands are optional when adding/editing products

const COMMON_BRANDS = [
  "Chicco",
  "Mastela",
  "Graco",
  "Kidilo",
  "Philips Avent",
  "Momcozy",
  "Joie",
  "IKEA",
  "4baby",
  "Juniors",
  "Burbay",
  "Tommee Tippee",
  "NUK",
  "Lansinoh",
  "Baby Brezza",
  "Spectra",
  "CAM",
  "4moms",
];

export const BRAND_OPTIONS = {
  "Strollers & Travel": COMMON_BRANDS,
  "Car Seats": COMMON_BRANDS,
  "Carry Cot": COMMON_BRANDS,
  "Bed": COMMON_BRANDS,
  "Feeding & Nursing": COMMON_BRANDS,
  "Bouncers & Swings": COMMON_BRANDS,
  "High Chairs": COMMON_BRANDS,
  "Toys & Play": COMMON_BRANDS,
  "Electronics & Monitors": COMMON_BRANDS,
  "Baby Walker": COMMON_BRANDS,
};

export function getBrandOptions(category) {
  return BRAND_OPTIONS[category] || [];
}

export function hasBrandOption(category) {
  return !!BRAND_OPTIONS[category];
}

export function getAllBrands() {
  const brands = new Set();
  Object.values(BRAND_OPTIONS).forEach((categoryBrands) => {
    categoryBrands.forEach((brand) => {
      if (brand !== "Other") brands.add(brand);
    });
  });
  return Array.from(brands).sort();
}
