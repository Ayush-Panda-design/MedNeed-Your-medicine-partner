// Presentation config for the homepage "Shop by category" bento grid.
// Categories themselves (slug, name, icon, blurb) still come from the database; this only decorates them.
// Any category not listed here falls back to FALLBACK_UI, so new categories always show up.

export type CategoryType = "prescription" | "otc" | "wellness" | "devices";
export type Tint = "rose" | "sky" | "amber" | "violet" | "green" | "red" | "pink" | "indigo" | "orange" | "blue" | "lime" | "cyan" | "fuchsia" | "teal" | "slate";

export type CategoryUi = {
  type: CategoryType;     // which filter chip it belongs to
  tint: Tint;             // pastel card tint + matching accent (see showcase.css)
  meta: string;           // tiny label on the card
  popular?: string[];     // "Popular" chips on featured cards; each links to a search
  count?: string;         // TODO: placeholder text. Replace with a real product count from the database.
};

/** Categories shown large (2 columns x 2 rows). Change this list to feature others. */
export const FEATURED_SLUGS: string[] = ["cold-cough", "vitamins"];

/** Set to false to hide the placeholder product counts until real numbers are wired in. */
export const SHOW_STATIC_COUNTS = true;

export const FALLBACK_UI: CategoryUi = { type: "wellness", tint: "teal", meta: "Wellness" };

export const CATEGORY_UI: Record<string, CategoryUi> = {
  "pain-relief": { type: "otc", tint: "rose", meta: "Rx & OTC", popular: ["Paracetamol", "Ibuprofen", "Pain relief gel"], count: "120+ products" },
  "cold-cough": { type: "otc", tint: "sky", meta: "Rx & OTC", popular: ["Cetirizine", "Cough syrup", "Nasal spray"], count: "120+ products" },
  "infection-care": { type: "prescription", tint: "amber", meta: "Rx" },
  "respiratory-care": { type: "prescription", tint: "violet", meta: "Rx" },
  "diabetes-care": { type: "prescription", tint: "green", meta: "Rx & devices", popular: ["Metformin", "Glucometer", "Test strips"], count: "120+ products" },
  "heart-care": { type: "prescription", tint: "red", meta: "Rx" },
  "vitamins": { type: "wellness", tint: "pink", meta: "Wellness", popular: ["Vitamin D3", "Multivitamin", "Omega-3"], count: "120+ products" },
  "brain-nerve": { type: "prescription", tint: "indigo", meta: "Rx" },
  "digestive-care": { type: "otc", tint: "orange", meta: "Rx & OTC", popular: ["Antacid", "ORS", "Probiotic"], count: "120+ products" },
  "eye-ear": { type: "otc", tint: "blue", meta: "Rx & OTC" },
  "skin-care": { type: "wellness", tint: "lime", meta: "Wellness" },
  "baby-care": { type: "wellness", tint: "cyan", meta: "Wellness" },
  "womens-care": { type: "wellness", tint: "fuchsia", meta: "Wellness" },
  "hormones-steroids": { type: "prescription", tint: "teal", meta: "Rx" },
  "devices": { type: "devices", tint: "slate", meta: "Devices" },
};

export const FILTERS: { id: "all" | CategoryType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "prescription", label: "Prescription" },
  { id: "otc", label: "OTC" },
  { id: "wellness", label: "Wellness" },
  { id: "devices", label: "Devices" },
];
