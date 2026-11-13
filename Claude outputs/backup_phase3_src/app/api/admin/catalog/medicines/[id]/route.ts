import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { isUniqueViolation } from "@/server/auth/users";
import { deleteDraft, getAdminMedicine, updateMedicine } from "@/server/catalog/repo";
import { updateMedicineInput } from "@/server/catalog/schema";

type Ctx = { params: Promise<{ id: string }> };
const PRICING_ONLY = new Set(["mrp", "price", "inStock"]);

export const PATCH = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "pharmacist", "inventory_manager"]);
  const { id } = await params;
  const patch = await readJson(req, updateMedicineInput);

  const privileged = user.roles.includes("admin") || user.roles.includes("pharmacist");
  if (!privileged) {
    // Inventory managers can fully edit drafts, but on a live product they can only change price and stock.
    const current = await getAdminMedicine(id);
    if (!current) throw new ApiError(404, "Medicine not found.");
    if (current.status === "active" && Object.keys(patch).some((k) => !PRICING_ONLY.has(k))) {
      throw new ApiError(403, "Only a pharmacist or admin can change the details of a live product. You can change price and stock.", "forbidden");
    }
  }
  try {
    const medicine = await updateMedicine({ id: user.id, ip: clientIp(req) }, id, patch);
    return ok({ medicine });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "Another medicine already has this name, manufacturer and pack size.", "duplicate");
    throw err;
  }
});

export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const { id } = await params;
  await deleteDraft({ id: user.id, ip: clientIp(req) }, id);
  return ok();
});
