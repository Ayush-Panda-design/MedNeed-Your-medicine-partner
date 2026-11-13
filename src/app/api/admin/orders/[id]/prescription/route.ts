import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { reviewPrescription } from "@/server/orders/place";

type Ctx = { params: Promise<{ id: string }> };

// Only a pharmacist (or admin) can sign off a prescription.
export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Order not found.");
  const b = await readJson(req, z.object({ decision: z.enum(["verified", "rejected"]), note: z.string().trim().min(3, "Add a short note").max(300) }));
  await reviewPrescription({ id: user.id, ip: clientIp(req), staff: true }, id, b.decision, b.note);
  return ok({ updated: true });
});
