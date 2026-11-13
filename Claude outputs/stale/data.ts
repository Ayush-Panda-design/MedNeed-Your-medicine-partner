// Mock catalog data for Phase 1. Replaced by the database in Phase 3.
// Product names, manufacturers and ratings are placeholders, not real listings.

export type Category = {
  slug: string;
  name: string;
  icon: string;
  blurb: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  composition: string;
  manufacturer: string;
  category: string;
  form: "Tablet" | "Capsule" | "Syrup" | "Gel" | "Cream" | "Drops" | "Device" | "Sachet" | "Spray";
  packSize: string;
  mrp: number;
  price: number;
  rx: boolean;
  inStock: boolean;
  rating: number;
  reviews: number;
  description: string;
  uses: string[];
  howToUse: string;
  sideEffects: string[];
  precautions: string[];
};

export const categories: Category[] = [
  { slug: "pain-relief", name: "Pain Relief", icon: "pill", blurb: "Fever, headache, body ache" },
  { slug: "cold-cough", name: "Cold & Cough", icon: "wind", blurb: "Relief for cold, flu and allergies" },
  { slug: "diabetes-care", name: "Diabetes Care", icon: "droplet", blurb: "Medicines, strips and monitors" },
  { slug: "heart-care", name: "Heart Care", icon: "heart-pulse", blurb: "Blood pressure and cholesterol" },
  { slug: "vitamins", name: "Vitamins & Supplements", icon: "sparkles", blurb: "Daily nutrition and immunity" },
  { slug: "digestive-care", name: "Digestive Care", icon: "stomach", blurb: "Acidity, gas and constipation" },
  { slug: "skin-care", name: "Skin Care", icon: "sun", blurb: "Creams, gels and sun care" },
  { slug: "baby-care", name: "Baby Care", icon: "baby", blurb: "Gentle care for little ones" },
  { slug: "womens-care", name: "Women's Care", icon: "flower", blurb: "Health and wellness essentials" },
  { slug: "devices", name: "Health Devices", icon: "stethoscope", blurb: "BP monitors, thermometers, more" },
];

type Seed = Omit<Product, "id" | "slug" | "inStock" | "description" | "uses" | "howToUse" | "sideEffects" | "precautions"> & {
  uses?: string[];
  inStock?: boolean;
};

const defaultSideEffects = ["Nausea", "Headache", "Dizziness", "Allergic reaction (rare)"];
const defaultPrecautions = [
  "Consult your doctor or pharmacist before use if you are pregnant, breastfeeding or on other medicines.",
  "Do not exceed the recommended dose.",
  "Keep out of reach of children. Store in a cool, dry place.",
];

const seeds: Seed[] = [
  { name: "Paracetamol 500mg Tablets", composition: "Paracetamol (500mg)", manufacturer: "Zenith Pharma", category: "pain-relief", form: "Tablet", packSize: "Strip of 15 tablets", mrp: 30, price: 26, rx: false, rating: 4.6, reviews: 1820, uses: ["Fever", "Mild to moderate pain", "Headache"] },
  { name: "Paracetamol 650mg Tablets", composition: "Paracetamol (650mg)", manufacturer: "Alder Healthcare", category: "pain-relief", form: "Tablet", packSize: "Strip of 15 tablets", mrp: 34, price: 29, rx: false, rating: 4.7, reviews: 2410, uses: ["Fever", "Body ache", "Toothache"] },
  { name: "Ibuprofen 400mg Tablets", composition: "Ibuprofen (400mg)", manufacturer: "Zenith Pharma", category: "pain-relief", form: "Tablet", packSize: "Strip of 15 tablets", mrp: 42, price: 35, rx: false, rating: 4.4, reviews: 760, uses: ["Pain and inflammation", "Menstrual cramps", "Fever"] },
  { name: "Diclofenac Pain Relief Gel", composition: "Diclofenac (1% w/w)", manufacturer: "Meridian Labs", category: "pain-relief", form: "Gel", packSize: "Tube of 30 g", mrp: 118, price: 98, rx: false, rating: 4.5, reviews: 1290, uses: ["Joint pain", "Muscle sprain", "Back pain"] },
  { name: "Cetirizine 10mg Tablets", composition: "Cetirizine (10mg)", manufacturer: "Alder Healthcare", category: "cold-cough", form: "Tablet", packSize: "Strip of 10 tablets", mrp: 24, price: 19, rx: false, rating: 4.5, reviews: 980, uses: ["Sneezing and runny nose", "Allergic rhinitis", "Itchy skin"] },
  { name: "Cough Relief Syrup", composition: "Dextromethorphan + Chlorpheniramine", manufacturer: "Meridian Labs", category: "cold-cough", form: "Syrup", packSize: "Bottle of 100 ml", mrp: 96, price: 78, rx: false, rating: 4.2, reviews: 540, uses: ["Dry cough", "Cold symptoms"] },
  { name: "Saline Nasal Spray", composition: "Sodium Chloride (0.65%)", manufacturer: "Nova Wellness", category: "cold-cough", form: "Spray", packSize: "Bottle of 20 ml", mrp: 85, price: 68, rx: false, rating: 4.3, reviews: 410, uses: ["Blocked nose", "Nasal dryness"] },
  { name: "Azithromycin 500mg Tablets", composition: "Azithromycin (500mg)", manufacturer: "Zenith Pharma", category: "cold-cough", form: "Tablet", packSize: "Strip of 3 tablets", mrp: 119, price: 101, rx: true, rating: 4.5, reviews: 880, uses: ["Bacterial infections of the chest, throat and ear"] },
  { name: "Metformin 500mg Tablets", composition: "Metformin (500mg)", manufacturer: "Alder Healthcare", category: "diabetes-care", form: "Tablet", packSize: "Strip of 20 tablets", mrp: 38, price: 32, rx: true, rating: 4.6, reviews: 1530, uses: ["Type 2 diabetes mellitus"] },
  { name: "Glimepiride 2mg Tablets", composition: "Glimepiride (2mg)", manufacturer: "Meridian Labs", category: "diabetes-care", form: "Tablet", packSize: "Strip of 15 tablets", mrp: 92, price: 78, rx: true, rating: 4.4, reviews: 620, uses: ["Type 2 diabetes mellitus"] },
  { name: "Glucose Test Strips (50)", composition: "Blood glucose test strips", manufacturer: "Nova Wellness", category: "diabetes-care", form: "Device", packSize: "Box of 50 strips", mrp: 899, price: 719, rx: false, rating: 4.5, reviews: 2210, uses: ["Home blood sugar monitoring"] },
  { name: "Amlodipine 5mg Tablets", composition: "Amlodipine (5mg)", manufacturer: "Zenith Pharma", category: "heart-care", form: "Tablet", packSize: "Strip of 15 tablets", mrp: 48, price: 41, rx: true, rating: 4.6, reviews: 1140, uses: ["High blood pressure", "Angina"] },
  { name: "Atorvastatin 10mg Tablets", composition: "Atorvastatin (10mg)", manufacturer: "Alder Healthcare", category: "heart-care", form: "Tablet", packSize: "Strip of 15 tablets", mrp: 110, price: 92, rx: true, rating: 4.5, reviews: 970, uses: ["High cholesterol", "Heart disease risk reduction"] },
  { name: "Telmisartan 40mg Tablets", composition: "Telmisartan (40mg)", manufacturer: "Meridian Labs", category: "heart-care", form: "Tablet", packSize: "Strip of 15 tablets", mrp: 128, price: 105, rx: true, rating: 4.4, reviews: 710, uses: ["High blood pressure"] },
  { name: "Vitamin C 500mg Chewable", composition: "Ascorbic Acid (500mg)", manufacturer: "Nova Wellness", category: "vitamins", form: "Tablet", packSize: "Strip of 15 tablets", mrp: 75, price: 58, rx: false, rating: 4.4, reviews: 1670, uses: ["Immunity support", "Vitamin C deficiency"] },
  { name: "Vitamin D3 60000 IU Capsules", composition: "Cholecalciferol (60000 IU)", manufacturer: "Alder Healthcare", category: "vitamins", form: "Capsule", packSize: "Strip of 4 capsules", mrp: 160, price: 128, rx: false, rating: 4.7, reviews: 2890, uses: ["Vitamin D deficiency", "Bone health"] },
  { name: "Multivitamin & Minerals", composition: "Multivitamin + Multimineral", manufacturer: "Nova Wellness", category: "vitamins", form: "Tablet", packSize: "Bottle of 60 tablets", mrp: 420, price: 315, rx: false, rating: 4.3, reviews: 1320, uses: ["Daily nutrition", "Energy and wellbeing"] },
  { name: "Omega-3 Fish Oil Capsules", composition: "Omega-3 Fatty Acids (1000mg)", manufacturer: "Nova Wellness", category: "vitamins", form: "Capsule", packSize: "Bottle of 60 capsules", mrp: 650, price: 489, rx: false, rating: 4.5, reviews: 1780, uses: ["Heart health", "Joint and brain health"] },
  { name: "Pantoprazole 40mg Tablets", composition: "Pantoprazole (40mg)", manufacturer: "Zenith Pharma", category: "digestive-care", form: "Tablet", packSize: "Strip of 15 tablets", mrp: 145, price: 120, rx: true, rating: 4.6, reviews: 1980, uses: ["Acid reflux", "Gastric ulcers"] },
  { name: "Antacid Liquid Mint", composition: "Magnesium Hydroxide + Aluminium Hydroxide", manufacturer: "Meridian Labs", category: "digestive-care", form: "Syrup", packSize: "Bottle of 170 ml", mrp: 115, price: 94, rx: false, rating: 4.4, reviews: 1050, uses: ["Acidity", "Heartburn", "Indigestion"] },
  { name: "Oral Rehydration Salts", composition: "ORS (WHO formula)", manufacturer: "Alder Healthcare", category: "digestive-care", form: "Sachet", packSize: "Pack of 5 sachets", mrp: 45, price: 38, rx: false, rating: 4.7, reviews: 1430, uses: ["Dehydration", "Diarrhoea"] },
  { name: "Probiotic Capsules", composition: "Lactobacillus + Bifidobacterium", manufacturer: "Nova Wellness", category: "digestive-care", form: "Capsule", packSize: "Strip of 10 capsules", mrp: 190, price: 152, rx: false, rating: 4.3, reviews: 640, uses: ["Gut health", "Antibiotic-associated diarrhoea"] },
  { name: "Clotrimazole Antifungal Cream", composition: "Clotrimazole (1% w/w)", manufacturer: "Meridian Labs", category: "skin-care", form: "Cream", packSize: "Tube of 15 g", mrp: 68, price: 55, rx: false, rating: 4.4, reviews: 870, uses: ["Fungal skin infections", "Ringworm", "Athlete's foot"] },
  { name: "Moisturising Cream SPF 30", composition: "Zinc Oxide + Moisturisers", manufacturer: "Nova Wellness", category: "skin-care", form: "Cream", packSize: "Tube of 50 g", mrp: 399, price: 299, rx: false, rating: 4.3, reviews: 520, uses: ["Sun protection", "Dry skin"] },
  { name: "Antiseptic Liquid", composition: "Chloroxylenol (4.8% w/v)", manufacturer: "Alder Healthcare", category: "skin-care", form: "Syrup", packSize: "Bottle of 250 ml", mrp: 165, price: 139, rx: false, rating: 4.6, reviews: 2060, uses: ["Cuts and wounds", "Antiseptic wash"] },
  { name: "Baby Gripe Water", composition: "Dill Oil + Sodium Bicarbonate", manufacturer: "Little Leaf Care", category: "baby-care", form: "Syrup", packSize: "Bottle of 150 ml", mrp: 92, price: 79, rx: false, rating: 4.5, reviews: 930, uses: ["Infant colic", "Gas relief"] },
  { name: "Diaper Rash Cream", composition: "Zinc Oxide (15%)", manufacturer: "Little Leaf Care", category: "baby-care", form: "Cream", packSize: "Tube of 50 g", mrp: 180, price: 149, rx: false, rating: 4.6, reviews: 1210, uses: ["Diaper rash", "Skin protection"] },
  { name: "Iron & Folic Acid Tablets", composition: "Ferrous Fumarate + Folic Acid", manufacturer: "Alder Healthcare", category: "womens-care", form: "Tablet", packSize: "Strip of 30 tablets", mrp: 85, price: 69, rx: false, rating: 4.4, reviews: 760, uses: ["Anaemia", "Pregnancy nutrition support"] },
  { name: "Calcium + Vitamin D3 Tablets", composition: "Calcium Carbonate + Vitamin D3", manufacturer: "Zenith Pharma", category: "womens-care", form: "Tablet", packSize: "Strip of 15 tablets", mrp: 140, price: 112, rx: false, rating: 4.5, reviews: 1690, uses: ["Bone health", "Calcium deficiency"] },
  { name: "Digital Thermometer", composition: "Digital clinical thermometer", manufacturer: "Nova Wellness", category: "devices", form: "Device", packSize: "1 unit", mrp: 250, price: 179, rx: false, rating: 4.5, reviews: 3120, uses: ["Body temperature measurement"] },
  { name: "Automatic BP Monitor", composition: "Upper-arm digital blood pressure monitor", manufacturer: "Nova Wellness", category: "devices", form: "Device", packSize: "1 unit", mrp: 2499, price: 1699, rx: false, rating: 4.4, reviews: 2540, uses: ["Home blood pressure monitoring"] },
  { name: "Pulse Oximeter", composition: "Fingertip pulse oximeter", manufacturer: "Nova Wellness", category: "devices", form: "Device", packSize: "1 unit", mrp: 1799, price: 1149, rx: false, rating: 4.3, reviews: 1980, uses: ["SpO2 and pulse rate monitoring"], inStock: false },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const products: Product[] = seeds.map((s, i) => ({
  ...s,
  id: `p${String(i + 1).padStart(3, "0")}`,
  slug: slugify(s.name),
  inStock: s.inStock ?? true,
  description: `${s.name} (${s.composition}) from ${s.manufacturer}. ${s.rx ? "Available on valid prescription only." : "Available without prescription."} Sold as ${s.packSize.toLowerCase()}.`,
  uses: s.uses ?? [],
  howToUse:
    s.form === "Device"
      ? "Follow the instructions in the user manual supplied with the device."
      : s.form === "Cream" || s.form === "Gel"
        ? "Apply a thin layer to the affected area as directed by your doctor or as per the label."
        : "Take exactly as directed by your doctor or as printed on the label. Do not exceed the recommended dose.",
  sideEffects: s.form === "Device" ? [] : defaultSideEffects,
  precautions: defaultPrecautions,
}));

export const brands = Array.from(new Set(products.map((p) => p.manufacturer))).sort();

export const healthConcerns = [
  "Fever",
  "Cold & flu",
  "Diabetes",
  "High blood pressure",
  "Acidity",
  "Immunity",
  "Joint pain",
  "Skin allergy",
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function discountPercent(p: Pick<Product, "mrp" | "price">) {
  return Math.round(((p.mrp - p.price) / p.mrp) * 100);
}

export function substitutesFor(p: Product) {
  // Same category, different product, cheapest first. Salt-based matching comes with the real catalog.
  return products
    .filter((x) => x.id !== p.id && x.category === p.category)
    .sort((a, b) => a.price - b.price)
    .slice(0, 4);
}

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export type SortKey = "relevance" | "price-asc" | "price-desc" | "discount" | "rating";

export type CatalogQuery = {
  q?: string;
  category?: string;
  brands?: string[];
  maxPrice?: number;
  otcOnly?: boolean;
  inStockOnly?: boolean;
  sort?: SortKey;
};

export function queryProducts(query: CatalogQuery) {
  let list = products.filter((p) => {
    if (query.category && p.category !== query.category) return false;
    if (query.brands?.length && !query.brands.includes(p.manufacturer)) return false;
    if (query.maxPrice && p.price > query.maxPrice) return false;
    if (query.otcOnly && p.rx) return false;
    if (query.inStockOnly && !p.inStock) return false;
    if (query.q) {
      const hay = `${p.name} ${p.composition} ${p.manufacturer} ${p.uses.join(" ")}`.toLowerCase();
      return query.q
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((t) => hay.includes(t));
    }
    return true;
  });

  switch (query.sort) {
    case "price-asc":
      list = [...list].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list = [...list].sort((a, b) => b.price - a.price);
      break;
    case "discount":
      list = [...list].sort((a, b) => discountPercent(b) - discountPercent(a));
      break;
    case "rating":
      list = [...list].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
      break;
    default:
      break;
  }
  return list;
}
