import { z } from "zod";
import { FORMS, SCHEDULES } from "@/lib/catalog";
import { isAllowedImageUrl } from "./storage";

export const CATEGORY_ICONS = ["pill", "wind", "droplet", "heart-pulse", "sparkles", "stomach", "sun", "baby", "flower", "stethoscope", "shield", "brain", "eye", "activity"] as const;

const twoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
const money = z
  .number("Enter a number")
  .positive("Must be greater than 0")
  .max(1_000_000, "Too large")
  .refine(twoDecimals, "Use at most 2 decimal places");

const textList = z
  .array(z.string().trim().min(1, "Empty items are not allowed").max(300, "Each item can be at most 300 characters"))
  .max(30, "At most 30 items");

export const saltSchema = z.object({
  name: z.string().trim().min(1, "Enter the salt name").max(120),
  strength: z.string().trim().max(40, "Strength is too long"),
});

export const medicineFields = z.object({
  name: z.string().trim().min(2, "Enter the medicine name").max(160),
  manufacturer: z.string().trim().min(2, "Enter the manufacturer").max(120),
  categoryId: z.uuid("Choose a category"),
  form: z.enum(FORMS, "Choose a form"),
  packSize: z.string().trim().min(1, "Enter the pack size").max(80),
  mrp: money,
  price: money,
  // "unknown" only exists on imported items; creating a medicine requires an explicit choice (see createMedicineInput).
  schedule: z.enum([...SCHEDULES, "unknown"], "Choose the prescription schedule"),
  noOnlineSale: z.boolean(),
  inStock: z.boolean(),
  salts: z.array(saltSchema).max(12, "At most 12 salts"),
  description: z.string().trim().max(4000),
  uses: textList,
  howToUse: z.string().trim().max(2000),
  sideEffects: textList,
  precautions: textList,
  imageUrl: z
    .string()
    .max(500)
    .refine(isAllowedImageUrl, "Upload the image through the admin panel")
    .nullable(),
  nppaCeilingPrice: money.nullable(),
});

export type MedicineFields = z.infer<typeof medicineFields>;

function checkDuplicatesAndPrice(v: Partial<MedicineFields>, ctx: z.RefinementCtx) {
  if (v.price != null && v.mrp != null && v.price > v.mrp) {
    ctx.addIssue({ code: "custom", path: ["price"], message: "Selling price cannot be higher than MRP" });
  }
  if (v.salts) {
    const seen = new Set<string>();
    for (const s of v.salts) {
      const k = s.name.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(k)) ctx.addIssue({ code: "custom", path: ["salts"], message: `${s.name} is listed twice` });
      seen.add(k);
    }
  }
}

export const createMedicineInput = medicineFields
  .superRefine(checkDuplicatesAndPrice)
  .refine((v) => v.schedule !== "unknown", { path: ["schedule"], message: "Choose the prescription schedule" });
export const updateMedicineInput = medicineFields
  .partial()
  .superRefine(checkDuplicatesAndPrice)
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const ACTIONS = ["verify", "unverify", "publish", "unpublish", "list", "unlist", "discontinue"] as const;
export type MedicineAction = (typeof ACTIONS)[number];

export const categoryInput = z.object({
  name: z.string().trim().min(2, "Enter a name").max(60),
  blurb: z.string().trim().max(120),
  icon: z.enum(CATEGORY_ICONS),
  sortOrder: z.number().int().min(0).max(10000),
  isActive: z.boolean(),
});
