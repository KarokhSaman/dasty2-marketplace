import { mutation } from "./_generated/server";
import type { Category, Condition } from "./types";

const R2_BASE = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
const icon = (name: string) => `${R2_BASE}/categories/${name}`;

const PHOTOS: Record<Category, string[]> = {
  "Strollers & Travel":     [icon("strollers.png")],
  "Car Seats":              [icon("carseats.png")],
  "Carry Cot":              [icon("carry-cot.png")],
  "Bed":                    [icon("bed.png")],
  "Feeding & Nursing":      [icon("feeding.png")],
  "Bouncers & Swings":      [icon("bouncers.png")],
  "High Chairs":            [icon("highchairs.png")],
  "Toys & Play":            [icon("toys.png")],
  "Electronics & Monitors": [icon("electronics.png")],
  "Other":                  [icon("other.png")],
};

type SampleProduct = {
  title: string;
  category: Category;
  condition: Condition;
  price: number;
  description: string;
  city?: string;
  featured?: boolean;
};

const SAMPLE_PRODUCTS: ReadonlyArray<SampleProduct> = [
  // Strollers & Travel
  { title: "Joie Litetrax 4 Stroller",      category: "Strollers & Travel",     condition: "used", price: 120000, description: "Lightweight stroller, very good condition. Used for 8 months. All accessories included." },
  { title: "Bugaboo Fox 3 Pram",             category: "Strollers & Travel",     condition: "used", price: 350000, description: "Premium stroller in excellent condition. Barely used, like new.", featured: true },
  { title: "Maclaren Quest Stroller",        category: "Strollers & Travel",     condition: "used", price: 85000,  description: "Compact fold stroller. Good condition, minor wear on fabric.", city: "Sulaymaniyah" },
  { title: "Silver Cross Wave Pram",         category: "Strollers & Travel",     condition: "new",  price: 420000, description: "Brand new, still in box. Received as gift, not needed." },
  { title: "Chicco Miinimo Stroller",        category: "Strollers & Travel",     condition: "used", price: 55000,  description: "Ultra-compact travel stroller. Perfect for trips.", city: "Duhok" },
  { title: "UPPAbaby Vista V2",              category: "Strollers & Travel",     condition: "used", price: 280000, description: "Expandable pram system, used 1 year. Includes bassinet." },
  { title: "Cybex Balios S Lux",             category: "Strollers & Travel",     condition: "used", price: 195000, description: "Reversible seat stroller. Excellent condition with all accessories.", city: "Baghdad" },
  { title: "Mamas & Papas Ocarro",           category: "Strollers & Travel",     condition: "used", price: 160000, description: "All-terrain stroller with leather details. Very clean.", city: "Sulaymaniyah" },
  { title: "Stokke Xplory X",                category: "Strollers & Travel",     condition: "used", price: 320000, description: "High-seat stroller for better parent connection. Like new.", featured: true },
  { title: "Doona Car Seat Stroller",        category: "Strollers & Travel",     condition: "used", price: 230000, description: "Car seat that converts to stroller. Perfect for travel.", city: "Erbil" },
  { title: "Babyzen YOYO2",                  category: "Strollers & Travel",     condition: "used", price: 175000, description: "Cabin-size folding stroller. Great for flights.", city: "Basra" },
  { title: "Quinny Zapp Flex Plus",          category: "Strollers & Travel",     condition: "used", price: 95000,  description: "Compact urban stroller, easy one-hand fold.", city: "Duhok" },

  // Car Seats
  { title: "Maxi-Cosi Pebble 360 Pro",       category: "Car Seats",              condition: "used", price: 180000, description: "Rotating infant car seat 0–13 kg. Used 10 months, excellent condition." },
  { title: "Joie i-Spin 360",                category: "Car Seats",              condition: "used", price: 120000, description: "360° swivel car seat, newborn to 4 years. Good condition.", city: "Sulaymaniyah" },
  { title: "BeSafe iZi Modular",             category: "Car Seats",              condition: "new",  price: 250000, description: "Brand new in box. Rear and forward facing. Never used.", featured: true },
  { title: "Cybex Cloud Z2 i-Size",          category: "Car Seats",              condition: "used", price: 145000, description: "Reclinable infant carrier with lie-flat position. Very good condition." },
  { title: "Chicco Seat3Fit",                category: "Car Seats",              condition: "used", price: 90000,  description: "3-in-1 car seat, grows with your child. Fully functional.", city: "Mosul" },
  { title: "Britax Römer Dualfix",           category: "Car Seats",              condition: "used", price: 170000, description: "Rotating Group 0+/1 car seat. Excellent condition.", city: "Kirkuk" },
  { title: "Nuna Pipa Lite",                 category: "Car Seats",              condition: "used", price: 135000, description: "Ultra-light infant car seat. Used briefly, like new.", city: "Erbil" },
  { title: "Graco SnugRide 35 Lite",         category: "Car Seats",              condition: "used", price: 70000,  description: "Affordable infant car seat with side-impact protection." },
  { title: "Maxi-Cosi Titan Pro",            category: "Car Seats",              condition: "new",  price: 210000, description: "Group 1/2/3 car seat with ClimaFlow. Sealed box.", city: "Baghdad" },

  // Carry Cot
  { title: "Silver Cross Dream Carrycot",    category: "Carry Cot",              condition: "used", price: 95000,  description: "Soft padded carrycot with hood. Excellent condition.", city: "Erbil" },
  { title: "Bugaboo Bee 6 Carrycot",         category: "Carry Cot",              condition: "used", price: 110000, description: "Lightweight bassinet attachment. Good condition.", city: "Sulaymaniyah" },
  { title: "Chicco Lullago Anywhere",        category: "Carry Cot",              condition: "new",  price: 85000,  description: "Portable bassinet for travel. Brand new in box." },
  { title: "Joie Calmi Carrycot",            category: "Carry Cot",              condition: "used", price: 60000,  description: "Car-safe carrycot. Used a few months only.", city: "Duhok" },
  { title: "UPPAbaby Bassinet",              category: "Carry Cot",              condition: "used", price: 75000,  description: "Lined bassinet for Vista/Cruz. Very clean.", featured: true },
  { title: "Stokke Xplory Carrycot",         category: "Carry Cot",              condition: "used", price: 120000, description: "Premium carrycot in beige. Like new.", city: "Erbil" },

  // Bed
  { title: "Stokke Sleepi Crib",             category: "Bed",                    condition: "used", price: 185000, description: "Oval crib that grows with baby. Excellent condition, natural wood.", featured: true },
  { title: "IKEA Sniglar Cot",               category: "Bed",                    condition: "used", price: 28000,  description: "Simple solid beech cot. Good condition, includes mattress.", city: "Baghdad" },
  { title: "Next2Me Dream Co-Sleeper",       category: "Bed",                    condition: "used", price: 75000,  description: "Side-sleeping crib, attaches to parent bed. Very good condition.", city: "Erbil" },
  { title: "Maxi-Cosi Iora Co-Sleeper",      category: "Bed",                    condition: "used", price: 65000,  description: "Adjustable height bedside crib. Lightly used." },
  { title: "Snüz Pod 4",                     category: "Bed",                    condition: "new",  price: 95000,  description: "Brand new bedside crib with breathable mesh.", city: "Sulaymaniyah" },
  { title: "IKEA Gulliver Cot",              category: "Bed",                    condition: "used", price: 35000,  description: "Solid white cot with adjustable base. Good condition." },
  { title: "Boori Eton Sleigh Cot",          category: "Bed",                    condition: "used", price: 120000, description: "Convertible sleigh cot, converts to toddler bed.", city: "Erbil" },

  // Feeding & Nursing
  { title: "Medela Swing Flex Pump",         category: "Feeding & Nursing",      condition: "used", price: 65000,  description: "Electric single breast pump. Cleaned and sanitised. All parts included." },
  { title: "Tommee Tippee Steriliser",       category: "Feeding & Nursing",      condition: "used", price: 25000,  description: "Electric steam steriliser. Fits up to 6 bottles. Good working condition.", city: "Mosul" },
  { title: "Dr Brown's Bottle Set",          category: "Feeding & Nursing",      condition: "used", price: 18000,  description: "10 anti-colic bottles. Thoroughly cleaned, excellent condition." },
  { title: "Spectra S1 Breast Pump",         category: "Feeding & Nursing",      condition: "used", price: 85000,  description: "Hospital grade double pump. Used 6 months. All accessories included.", featured: true },
  { title: "Philips Avent Bottle Warmer",    category: "Feeding & Nursing",      condition: "used", price: 22000,  description: "Quick bottle warmer. Works perfectly.", city: "Sulaymaniyah" },
  { title: "MAM Anti-Colic Bottles",         category: "Feeding & Nursing",      condition: "new",  price: 14000,  description: "Set of 4 self-sterilising bottles, never opened." },
  { title: "Lansinoh Manual Pump",           category: "Feeding & Nursing",      condition: "used", price: 19000,  description: "Compact manual breast pump. Cleaned and ready.", city: "Erbil" },
  { title: "Munchkin Bottle Drying Rack",    category: "Feeding & Nursing",      condition: "used", price: 8000,   description: "Grass-style drying rack. Used but in good shape." },
  { title: "Elvie Stride Wearable Pump",     category: "Feeding & Nursing",      condition: "used", price: 145000, description: "Hands-free wearable breast pump. Like new.", city: "Erbil" },

  // Bouncers & Swings
  { title: "Fisher-Price Snugapuppy Swing",  category: "Bouncers & Swings",      condition: "used", price: 55000,  description: "6-speed baby swing with music and mobile. Very good condition." },
  { title: "BabyBjörn Bouncer Bliss",        category: "Bouncers & Swings",      condition: "used", price: 72000,  description: "Mesh bouncer, lightweight and easy to fold. Excellent condition.", featured: true },
  { title: "Graco DuetSoothe Swing",         category: "Bouncers & Swings",      condition: "used", price: 48000,  description: "Converts from swing to rocker. Good working condition.", city: "Duhok" },
  { title: "Mamaroo 4moms Swing",            category: "Bouncers & Swings",      condition: "used", price: 130000, description: "Premium motorised swing with 5 motions. Excellent condition.", city: "Baghdad" },
  { title: "Ingenuity ConvertMe Bouncer",    category: "Bouncers & Swings",      condition: "new",  price: 38000,  description: "2-in-1 bouncer to seat. Brand new in box." },
  { title: "Fisher-Price Sweet Snugapuppy",  category: "Bouncers & Swings",      condition: "used", price: 32000,  description: "Vibrating bouncer with toy bar. Like new.", city: "Erbil" },

  // High Chairs
  { title: "Chicco Polly Highchair",         category: "High Chairs",            condition: "used", price: 45000,  description: "7-position reclining highchair. Easy to clean. Good condition." },
  { title: "Stokke Tripp Trapp",             category: "High Chairs",            condition: "used", price: 110000, description: "Iconic Stokke chair that grows with child. Excellent.", featured: true },
  { title: "IKEA Antilop Highchair",         category: "High Chairs",            condition: "used", price: 12000,  description: "Simple, easy-clean highchair. Includes tray.", city: "Sulaymaniyah" },
  { title: "Joie Mimzy 2-in-1",              category: "High Chairs",            condition: "used", price: 38000,  description: "Easy fold highchair with adjustable height.", city: "Erbil" },
  { title: "Hauck Sit'n Relax",              category: "High Chairs",            condition: "new",  price: 55000,  description: "3-in-1 highchair, bouncer, and bassinet. Sealed.", city: "Mosul" },
  { title: "Peg Perego Siesta",              category: "High Chairs",            condition: "used", price: 75000,  description: "Italian-made highchair, compact fold. Like new." },

  // Toys & Play
  { title: "Fisher-Price Kick & Play Mat",   category: "Toys & Play",            condition: "used", price: 22000,  description: "Baby activity gym with piano. Clean and in great condition." },
  { title: "VTech Baby Learning Cube",       category: "Toys & Play",            condition: "used", price: 15000,  description: "Interactive learning cube with lights and music. Works perfectly.", city: "Kirkuk" },
  { title: "LEGO DUPLO Classic Set",         category: "Toys & Play",            condition: "used", price: 35000,  description: "Complete set, no missing pieces. Clean and good condition." },
  { title: "Wooden Rainbow Stacking Toy",    category: "Toys & Play",            condition: "new",  price: 28000,  description: "Brand new Montessori stacking rainbow. Educational and beautiful." },
  { title: "Skip Hop Activity Center",       category: "Toys & Play",            condition: "used", price: 42000,  description: "Bouncing activity center with toys. Good condition.", city: "Erbil" },
  { title: "Lovevery Play Kit (3-6m)",       category: "Toys & Play",            condition: "used", price: 38000,  description: "Complete play kit with all original pieces.", featured: true },
  { title: "Melissa & Doug Wooden Puzzle",   category: "Toys & Play",            condition: "new",  price: 9000,   description: "Chunky wooden farm animal puzzle. New.", city: "Duhok" },
  { title: "Baby Einstein Take Along Tunes", category: "Toys & Play",            condition: "used", price: 7000,   description: "Musical toy with classical melodies. Works great." },
  { title: "Tiny Love Gymini Activity Mat",  category: "Toys & Play",            condition: "used", price: 26000,  description: "5-in-1 activity gym. Lightly used, very clean.", city: "Sulaymaniyah" },

  // Electronics & Monitors
  { title: "Motorola MBP36XL Monitor",       category: "Electronics & Monitors", condition: "used", price: 65000,  description: "Video baby monitor with 5\" screen. Range 300m. Good condition." },
  { title: "Nanit Pro Smart Baby Camera",    category: "Electronics & Monitors", condition: "used", price: 120000, description: "Wi-Fi HD baby monitor with sleep tracking. Excellent condition.", featured: true },
  { title: "Owlet Smart Sock 3",             category: "Electronics & Monitors", condition: "used", price: 95000,  description: "Heart rate and oxygen monitor for babies. Barely used." },
  { title: "VTech VM5251 Monitor",           category: "Electronics & Monitors", condition: "used", price: 48000,  description: "Pan-tilt-zoom video monitor. Excellent range.", city: "Baghdad" },
  { title: "Hatch Rest Sound Machine",       category: "Electronics & Monitors", condition: "new",  price: 35000,  description: "Smart sound machine, night light, time-to-rise. Sealed.", city: "Erbil" },
  { title: "Babysense 7 Movement Monitor",   category: "Electronics & Monitors", condition: "used", price: 75000,  description: "Under-mattress breathing monitor. Like new." },
  { title: "Angelcare AC527",                category: "Electronics & Monitors", condition: "used", price: 88000,  description: "Movement and video monitor combo.", city: "Sulaymaniyah" },

  // Other
  { title: "Skip Hop Diaper Backpack",       category: "Other",                  condition: "used", price: 22000,  description: "Stylish diaper backpack with changing pad.", city: "Erbil" },
  { title: "Ergobaby Omni 360 Carrier",      category: "Other",                  condition: "used", price: 85000,  description: "All-position baby carrier. Excellent condition.", featured: true },
  { title: "BabyBjörn Travel Crib Light",    category: "Other",                  condition: "used", price: 95000,  description: "Lightweight travel crib with carry bag." },
  { title: "Munchkin Diaper Pail",           category: "Other",                  condition: "used", price: 18000,  description: "Step-Pail with odour control. Includes refill.", city: "Duhok" },
  { title: "Boppy Nursing Pillow",           category: "Other",                  condition: "used", price: 14000,  description: "Classic nursing pillow with cover. Washed clean." },
  { title: "Petit Bateau Newborn Set",       category: "Other",                  condition: "new",  price: 25000,  description: "Brand new 5-piece newborn clothing set.", city: "Erbil" },
  { title: "Hauck Travel Bed",               category: "Other",                  condition: "used", price: 32000,  description: "Compact travel cot with mattress.", city: "Basra" },
  { title: "Bath Tub with Stand",            category: "Other",                  condition: "used", price: 21000,  description: "Baby bath tub with foldable stand and thermometer.", city: "Erbil" },
  { title: "BabyBjörn Carrier Original",     category: "Other",                  condition: "used", price: 42000,  description: "Soft cotton baby carrier, front-facing. Clean.", city: "Mosul" },
];

function calcProfit(price: number): number {
  if (price <= 9000)   return 2000;
  if (price <= 29000)  return 3000;
  if (price <= 49000)  return 4000;
  if (price <= 99000)  return 5000;
  if (price <= 199000) return 10000;
  if (price <= 299000) return 15000;
  if (price <= 399000) return 20000;
  if (price <= 499000) return 25000;
  return 30000;
}

export const seedProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "seller"))
      .first();
    let sellerId: string;
    let sellerName: string;
    let sellerPhone: string;

    if (existing) {
      sellerId    = existing._id.toString();
      sellerName  = existing.name;
      sellerPhone = existing.phone ?? "+964 750 971 7177";
    } else {
      const newId = await ctx.db.insert("users", {
        role: "seller",
        name: "Dasty2 Demo",
        email: "demo@dasty2mndalan.com",
        phone: "+964 750 971 7177",
        city: "Erbil",
        registeredAt: new Date().toISOString(),
        isActive: true,
      });
      sellerId    = newId.toString();
      sellerName  = "Dasty2 Demo";
      sellerPhone = "+964 750 971 7177";
    }

    const year = new Date().getFullYear().toString().slice(-2);
    const count = (await ctx.db.query("products").collect()).length;
    let seqN = count + 1;
    const now = new Date().toISOString();

    for (const p of SAMPLE_PRODUCTS) {
      await ctx.db.insert("products", {
        seq:         `${year}-${String(seqN++).padStart(4, "0")}`,
        title:       p.title,
        description: p.description,
        category:    p.category,
        condition:   p.condition,
        price:       p.price,
        profit:      calcProfit(p.price),
        photos:      PHOTOS[p.category],
        status:      "approved",
        city:        p.city ?? "Erbil",
        sellerId,
        sellerName,
        sellerPhone,
        featured:    p.featured ?? false,
        dateAdded:   now,
      });
    }

    return `Seeded ${SAMPLE_PRODUCTS.length} products.`;
  },
});
