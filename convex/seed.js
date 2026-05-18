import { mutation } from "./_generated/server";

function profit(price) {
  if (price >= 5000 && price <= 9000) return 2000;
  if (price >= 10000 && price <= 29000) return 3000;
  if (price >= 30000 && price <= 49000) return 4000;
  if (price >= 50000 && price <= 99000) return 5000;
  if (price >= 100000 && price <= 199000) return 10000;
  if (price >= 200000 && price <= 299000) return 15000;
  if (price >= 300000 && price <= 399000) return 20000;
  if (price >= 400000 && price <= 499000) return 25000;
  if (price >= 500000 && price <= 1000000) return 30000;
  return 0;
}

const SAMPLE_PRODUCTS = [
  {
    seq: "001",
    title: "Bugaboo Fox 3 Complete Stroller — Grey Melange",
    description: "Used for only 4 months. Includes carrycot, seat unit, and original rain cover. In excellent condition. All original accessories included.",
    category: "Stroller",
    condition: "used",
    price: 550000,
    photos: [
      "https://images.unsplash.com/photo-1590503522834-b3854c0f4647?w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590503522834-b3854c0f4647?w=600&auto=format&fit=crop&q=80",
    ],
    featured: true,
    sellerId: "seed_1",
    sellerName: "Sara Ahmed",
    sellerPhone: "07501111111",
    city: "Erbil",
  },
  {
    seq: "002",
    title: "Chicco Next2Me Magic Bedside Crib — White",
    description: "Brand new, still in box. Converts from bedside crib to standalone cot. Fits most beds. Up to 9 kg.",
    category: "Next2me",
    condition: "new",
    price: 320000,
    photos: [
      "https://images.unsplash.com/photo-1519689373023-dd07c7988603?w=600&auto=format&fit=crop",
    ],
    featured: true,
    sellerId: "seed_2",
    sellerName: "Lana Kareem",
    sellerPhone: "07502222222",
    city: "Erbil",
  },
  {
    seq: "003",
    title: "Maxi-Cosi Pebble 360 Pro Car Seat — Essential Black",
    description: "Used from birth to 12 months. No accidents. Comes with original base. Easy 360° rotation. ISOFIX included.",
    category: "Carseat",
    condition: "used",
    price: 180000,
    photos: [
      "https://images.unsplash.com/photo-1617854818583-09e7f077a156?w=600&auto=format&fit=crop",
    ],
    featured: false,
    sellerId: "seed_3",
    sellerName: "Hana Soran",
    sellerPhone: "07503333333",
    city: "Erbil",
  },
  {
    seq: "004",
    title: "Ergobaby Omni 360 Baby Carrier — Cool Air Mesh",
    description: "New without tags. Bought as a gift, never used. Supports newborn to toddler 45 kg. All 4 carry positions.",
    category: "Carrier",
    condition: "new",
    price: 145000,
    photos: [
      "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=600&auto=format&fit=crop",
    ],
    featured: false,
    sellerId: "seed_4",
    sellerName: "Roza Hassan",
    sellerPhone: "07504444444",
    city: "Erbil",
  },
  {
    seq: "005",
    title: "IKEA ANTILOP High Chair with Tray — White/Silver",
    description: "Clean and in great condition. Legs detach for easy storage. Comes with original tray and safety belt.",
    category: "Highchair",
    condition: "used",
    price: 28000,
    photos: [
      "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop",
    ],
    featured: false,
    sellerId: "seed_5",
    sellerName: "Dina Aziz",
    sellerPhone: "07505555555",
    city: "Erbil",
  },
  {
    seq: "006",
    title: "Baby Einstein Sea & Discover Door Jumper",
    description: "Used for 2 months. Adjustable height. Suitable from when baby can hold head up. Includes toys on tray.",
    category: "Jumper",
    condition: "used",
    price: 55000,
    photos: [
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&auto=format&fit=crop",
    ],
    featured: false,
    sellerId: "seed_6",
    sellerName: "Shirin Mustafa",
    sellerPhone: "07506666666",
    city: "Erbil",
  },
  {
    seq: "007",
    title: "Uppababy Vista V2 Carrycot — Greyson Charcoal",
    description: "Barely used, like new. Compatible with Vista V2 and Cruz V2 frames. Can be used as overnight sleep space.",
    category: "Carrycot",
    condition: "used",
    price: 210000,
    photos: [
      "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&auto=format&fit=crop",
    ],
    featured: false,
    sellerId: "seed_7",
    sellerName: "Naz Ibrahim",
    sellerPhone: "07507777777",
    city: "Erbil",
  },
  {
    seq: "008",
    title: "Ingenuity Comfort 2 Go Portable Swing — Audrey",
    description: "New in box. Plug-in or battery powered. 6 swing speeds, 8 melodies. Folds flat for travel.",
    category: "Electrics",
    condition: "new",
    price: 85000,
    photos: [
      "https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=600&auto=format&fit=crop",
    ],
    featured: false,
    sellerId: "seed_8",
    sellerName: "Sana Omar",
    sellerPhone: "07508888888",
    city: "Erbil",
  },
  {
    seq: "009",
    title: "Joie Litetrax 4 Flex Stroller — Coal",
    description: "Used for 6 months. Full recline, one-hand fold, large basket. Good condition, slight scuff on frame.",
    category: "Stroller",
    condition: "used",
    price: 130000,
    photos: [
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&auto=format&fit=crop",
    ],
    featured: false,
    sellerId: "seed_9",
    sellerName: "Bana Jalal",
    sellerPhone: "07509999999",
    city: "Erbil",
  },
  {
    seq: "010",
    title: "Mastela 5-in-1 Baby Rocker and Bouncer — Blue",
    description: "Brand new, unused. Converts to rocker, bouncer, and booster seat. Safe for 0–18 months.",
    category: "Mastela",
    condition: "new",
    price: 65000,
    photos: [
      "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=600&auto=format&fit=crop",
    ],
    featured: false,
    sellerId: "seed_2",
    sellerName: "Lana Kareem",
    sellerPhone: "07502222222",
    city: "Erbil",
  },
  {
    seq: "011",
    title: "Silverleaf Muslin Swaddle Blankets — Set of 4",
    description: "100% organic cotton. Pre-washed, super soft. Large 120x120cm. Pink, blue, mint, and grey.",
    category: "Fabric",
    condition: "new",
    price: 38000,
    photos: [
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop",
    ],
    featured: false,
    sellerId: "seed_1",
    sellerName: "Sara Ahmed",
    sellerPhone: "07501111111",
    city: "Erbil",
  },
  {
    seq: "012",
    title: "Chicco Oasys 2-3 FixPlus Evo Car Seat — Black Air",
    description: "Used from 15 months to 3 years. ISOFIX. Reclines 4 positions. Washable cover. No accidents.",
    category: "Carseat",
    condition: "used",
    price: 160000,
    photos: [
      "https://images.unsplash.com/photo-1617854818583-09e7f077a156?w=600&auto=format&fit=crop&sat=-50",
    ],
    featured: false,
    sellerId: "seed_10",
    sellerName: "Awat Salih",
    sellerPhone: "07500000001",
    city: "Erbil",
  },
];

export const seedProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();

    for (const p of SAMPLE_PRODUCTS) {
      await ctx.db.insert("products", {
        ...p,
        profit: profit(p.price),
        status: "approved",
        views: Math.floor(Math.random() * 80) + 5,
        dateAdded: now,
      });
    }

    return `Inserted ${SAMPLE_PRODUCTS.length} sample products.`;
  },
});
