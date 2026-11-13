// Client-safe catalog types and helpers (no server imports). The data itself lives in the database.

export const FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Suspension",
  "Injection",
  "Gel",
  "Cream",
  "Ointment",
  "Lotion",
  "Drops",
  "Spray",
  "Inhaler",
  "Powder",
  "Sachet",
  "Device",
  "Other",
] as const;
export type Form = (typeof FORMS)[number];

/** Drugs and Cosmetics Rules schedule. OTC means no prescription is needed. */
export const SCHEDULES = ["OTC", "H", "H1", "X"] as const;
/** "unknown" = imported data whose schedule nobody has confirmed yet. Treated as prescription-only and never published. */
export type Schedule = (typeof SCHEDULES)[number] | "unknown";

export const SCHEDULE_HELP: Record<Schedule, string> = {
  OTC: "Over the counter. No prescription needed.",
  H: "Prescription required.",
  H1: "Prescription required, with extra record-keeping. Antibiotics and some other drugs.",
  X: "Strictly controlled. Never sold online.",
  unknown: "Not confirmed yet (imported data). Treated as prescription-only. A pharmacist must choose the schedule before this can be verified or published.",
};

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
  /** Display string, e.g. "Paracetamol (500mg) + Caffeine (30mg)". */
  composition: string;
  manufacturer: string;
  category: string;
  categoryName: string;
  form: string;
  packSize: string;
  mrp: number;
  price: number;
  schedule: Schedule;
  /** True for any schedule other than OTC. */
  rx: boolean;
  inStock: boolean;
  imageUrl: string | null;
  /** True when it can be bought online. False for catalog-only listings (details shown, price not confirmed). */
  orderable: boolean;
  /** Schedule X or marked never sold online: cannot be requested online either. */
  restricted: boolean;
};

export type ProductDetail = Product & {
  description: string;
  uses: string[];
  howToUse: string;
  sideEffects: string[];
  precautions: string[];
  salts: { name: string; strength: string }[];
  dataStatus: "unverified" | "verified" | "sample";
  nppaCeilingPrice: number | null;
  updatedAt: string;
};

export type SortKey = "relevance" | "price-asc" | "price-desc" | "discount";
export const SORT_KEYS: SortKey[] = ["relevance", "price-asc", "price-desc", "discount"];

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

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/** Prices with paise, for places where rounding would mislead (admin, receipts). */
export const formatINRExact = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(n);

export function discountPercent(p: Pick<Product, "mrp" | "price">) {
  return Math.max(0, Math.round(((p.mrp - p.price) / p.mrp) * 100));
}

// CSV import format (used by the importer on the server and the template download in the admin panel).
export const CSV_REQUIRED_COLUMNS = ["name", "manufacturer", "category", "form", "pack_size", "mrp", "price", "schedule"] as const;
export const CSV_OPTIONAL_COLUMNS = [
  "composition", "description", "uses", "side_effects", "precautions", "how_to_use", "nppa_ceiling_price", "no_online_sale", "in_stock", "source_ref",
] as const;
export const CSV_TEMPLATE_HEADER: string[] = [...CSV_REQUIRED_COLUMNS, ...CSV_OPTIONAL_COLUMNS];
export const CSV_TEMPLATE_EXAMPLE = [
  "Examplecillin 500mg Capsule", "Example Pharma Ltd", "cold-cough", "Capsule", "Strip of 10 capsules", "120", "102", "H",
  "Examplecillin (500mg)", "Placeholder description", "Throat infection|Chest infection", "Nausea|Rash", "Complete the full course", "Take as directed by your doctor", "", "no", "yes", "SKU-0001",
];
