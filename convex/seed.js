import { mutation } from "./_generated/server";

const PHOTOS = {
  "Strollers & Travel":     ["https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/strollers_mr5mhk.png"],
  "Car Seats":              ["https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138358/carseats_lpxcga.png"],
  "Carry Cot":              ["https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138358/Carry_Cot_y7yace.png"],
  "Bed":                    ["https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138358/Bed_ouycjy.png"],
  "Feeding & Nursing":      ["https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/feeding_aoipl9.png"],
  "Bouncers & Swings":      ["https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779141106/bouncers_wrha1c.png"],
  "High Chairs":            ["https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138342/highchairs_erlg5h.png"],
  "Toys & Play":            ["https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/toys_dziew5.png"],
  "Electronics & Monitors": ["https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779138359/electronics_qqj0mi.png"],
  "Other":                  ["https://res.cloudinary.com/dqtgvfpk4/image/upload/v1779141105/Other_jq5gok.png"],
};

const SAMPLE_PRODUCTS = [
  { title: "Joie Litetrax 4 Stroller",      category: "Strollers & Travel",     condition: "used", price: 120000, description: "Lightweight stroller, very good condition. Used for 8 months. All accessories included." },
  { title: "Bugaboo Fox 3 Pram",             category: "Strollers & Travel",     condition: "used", price: 350000, description: "Premium stroller in excellent condition. Barely used, like new." },
  { title: "Maclaren Quest Stroller",        category: "Strollers & Travel",     condition: "used", price: 85000,  description: "Compact fold stroller. Good condition, minor wear on fabric." },
  { title: "Silver Cross Wave Pram",         category: "Strollers & Travel",     condition: "new",  price: 420000, description: "Brand new, still in box. Received as gift, not needed." },
  { title: "Chicco Miinimo Stroller",        category: "Strollers & Travel",     condition: "used", price: 55000,  description: "Ultra-compact travel stroller. Perfect for trips." },
  { title: "UPPAbaby Vista V2",              category: "Strollers & Travel",     condition: "used", price: 280000, description: "Expandable pram system, used 1 year. Includes bassinet." },
  { title: "Cybex Balios S Lux",             category: "Strollers & Travel",     condition: "used", price: 195000, description: "Reversible seat stroller. Excellent condition with all accessories." },
  { title: "Maxi-Cosi Pebble 360 Pro",       category: "Car Seats",              condition: "used", price: 180000, description: "Rotating infant car seat 0–13 kg. Used 10 months, excellent condition." },
  { title: "Joie i-Spin 360",                category: "Car Seats",              condition: "used", price: 120000, description: "360° swivel car seat, newborn to 4 years. Good condition." },
  { title: "BeSafe iZi Modular",             category: "Car Seats",              condition: "new",  price: 250000, description: "Brand new in box. Rear and forward facing. Never used." },
  { title: "Cybex Cloud Z2 i-Size",          category: "Car Seats",              condition: "used", price: 145000, description: "Reclinable infant carrier with lie-flat position. Very good condition." },
  { title: "Chicco Seat3Fit",                category: "Car Seats",              condition: "used", price: 90000,  description: "3-in-1 car seat, grows with your child. Fully functional." },
  { title: "Medela Swing Flex Pump",         category: "Feeding & Nursing",      condition: "used", price: 65000,  description: "Electric single breast pump. Cleaned and sanitised. All parts included." },
  { title: "Tommee Tippee Steriliser",       category: "Feeding & Nursing",      condition: "used", price: 25000,  description: "Electric steam steriliser. Fits up to 6 bottles. Good working condition." },
  { title: "Dr Brown's Bottle Set",          category: "Feeding & Nursing",      condition: "used", price: 18000,  description: "10 anti-colic bottles. Thoroughly cleaned, excellent condition." },
  { title: "Spectra S1 Breast Pump",         category: "Feeding & Nursing",      condition: "used", price: 85000,  description: "Hospital grade double pump. Used 6 months. All accessories included." },
  { title: "Fisher-Price Kick & Play Mat",   category: "Toys & Play",            condition: "used", price: 22000,  description: "Baby activity gym with piano. Clean and in great condition." },
  { title: "VTech Baby Learning Cube",       category: "Toys & Play",            condition: "used", price: 15000,  description: "Interactive learning cube with lights and music. Works perfectly." },
  { title: "LEGO DUPLO Classic Set",         category: "Toys & Play",            condition: "used", price: 35000,  description: "Complete set, no missing pieces. Clean and good condition." },
  { title: "Wooden Rainbow Stacking Toy",    category: "Toys & Play",            condition: "new",  price: 28000,  description: "Brand new Montessori stacking rainbow. Educational and beautiful." },
  { title: "Fisher-Price Snugapuppy Swing",  category: "Bouncers & Swings",      condition: "used", price: 55000,  description: "6-speed baby swing with music and mobile. Very good condition." },
  { title: "BabyBjörn Bouncer Bliss",        category: "Bouncers & Swings",      condition: "used", price: 72000,  description: "Mesh bouncer, lightweight and easy to fold. Excellent condition." },
  { title: "Graco DuetSoothe Swing",         category: "Bouncers & Swings",      condition: "used", price: 48000,  description: "Converts from swing to rocker. Good working condition." },
  { title: "Motorola MBP36XL Monitor",       category: "Electronics & Monitors", condition: "used", price: 65000,  description: "Video baby monitor with 5\" screen. Range 300m. Good condition." },
  { title: "Nanit Pro Smart Baby Camera",    category: "Electronics & Monitors", condition: "used", price: 120000, description: "Wi-Fi HD baby monitor with sleep tracking. Excellent condition." },
  { title: "Owlet Smart Sock 3",             category: "Electronics & Monitors", condition: "used", price: 95000,  description: "Heart rate and oxygen monitor for babies. Barely used." },
  { title: "Stokke Sleepi Crib",             category: "Bed",                    condition: "used", price: 185000, description: "Oval crib that grows with baby. Excellent condition, natural wood." },
  { title: "IKEA Sniglar Cot",               category: "Bed",                    condition: "used", price: 28000,  description: "Simple solid beech cot. Good condition, includes mattress." },
  { title: "Next2Me Dream Co-Sleeper",       category: "Bed",                    condition: "used", price: 75000,  description: "Side-sleeping crib, attaches to parent bed. Very good condition." },
  { title: "Chicco Polly Highchair",         category: "High Chairs",            condition: "used", price: 45000,  description: "7-position reclining highchair. Easy to clean. Good condition." },
];

function calcProfit(price) {
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
    const existing = await ctx.db.query("sellers").first();
    let sellerId, sellerName, sellerPhone;

    if (existing) {
      sellerId    = existing._id;
      sellerName  = existing.name;
      sellerPhone = existing.phone ?? "+964 750 971 7177";
    } else {
      sellerId = await ctx.db.insert("sellers", {
        name: "Dasty2 Demo",
        email: "demo@dasty2mndalan.com",
        phone: "+964 750 971 7177",
        city: "Erbil",
        clerkUserId: "",
        registeredAt: new Date().toISOString(),
        isActive: true,
      });
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
        photos:      PHOTOS[p.category] ?? [],
        status:      "approved",
        city:        "Erbil",
        sellerId:    sellerId.toString(),
        sellerName,
        sellerPhone,
        featured:    false,
        dateAdded:   now,
      });
    }

    return `Seeded ${SAMPLE_PRODUCTS.length} products.`;
  },
});
