import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const money = (label: string) =>
  z
    .number(`${label}: enter a number`)
    .min(0, `${label} cannot be negative`)
    .max(1_000_000, `${label} is too large`)
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, `${label}: use at most 2 decimal places`);

export const supplierInput = z.object({
  name: z.string().trim().min(2, "Enter the supplier name").max(120),
  phone: text(20),
  gstin: text(20),
  drugLicense: text(60),
  address: text(300),
  notes: text(500),
  isActive: z.boolean(),
});
export type SupplierInput = z.infer<typeof supplierInput>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD").refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), "Not a real date");

export const purchaseLine = z.object({
  medicineId: z.uuid("Choose a medicine"),
  batchNo: z.string().trim().min(1, "Enter the batch number").max(40).regex(/^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/, "Batch number has unusual characters"),
  expiryDate: isoDate,
  qty: z.number().int("Quantity must be a whole number").min(0).max(100_000),
  freeQty: z.number().int("Free quantity must be a whole number").min(0).max(100_000),
  mrp: money("MRP").refine((n) => n > 0, "MRP must be greater than 0"),
  purchaseRate: money("Purchase rate"),
});

export const purchaseInput = z.object({
  supplierId: z.uuid("Choose a supplier"),
  billNumber: z.string().trim().min(1, "Enter the bill number").max(40),
  billDate: isoDate,
  notes: text(500),
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
  lines: z.array(purchaseLine).min(1, "Add at least one line").max(200, "At most 200 lines per bill"),
});
export type PurchaseInput = z.infer<typeof purchaseInput>;

export const adjustInput = z.object({
  kind: z.enum(["damage", "expired", "correction", "supplier_return"]),
  // Negative removes stock, positive adds (only allowed for "correction").
  delta: z.number().int("Quantity must be a whole number").refine((n) => n !== 0, "Quantity cannot be zero").refine((n) => Math.abs(n) <= 100_000, "Too large"),
  reason: z.string().trim().min(5, "Give a reason (at least 5 characters)").max(300),
});
export type AdjustInput = z.infer<typeof adjustInput>;

export const inventorySettingsInput = z.object({
  discountPercent: z.number().min(0).max(90).refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "At most 2 decimal places").optional(),
  reorderLevel: z.number().int().min(0).max(100_000).optional(),
  /** null = use the shop's default rate. */
  gstPercent: z.number().min(0).max(40).nullable().optional(),
  hsn: z.string().trim().regex(/^(\d{4,8})?$/, "HSN is 4 to 8 digits").optional(),
});
