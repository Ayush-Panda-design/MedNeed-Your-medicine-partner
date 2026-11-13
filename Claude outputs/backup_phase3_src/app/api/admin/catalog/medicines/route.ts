import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { isUniqueViolation } from "@/server/auth/users";
import { ApiError } from "@/server/http";
import { createMedicine } from "@/server/catalog/repo";
import { createMedicineInput } from "@/server/catalog/schema";

// Any staff role may add a medicine, but it is always created as an unverified draft that cannot be seen by customers.
export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin", "pharmacist", "inventory_manager"]);
  const body = await readJson(req, createMedicineInput);
  try {
    const medicine = await createMedicine({ id: user.id, ip: clientIp(req) }, body);
    return ok({ medicine }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "A medicine with this name, manufacturer and pack size already exists.", "duplicate");
    throw err;
  }
});
