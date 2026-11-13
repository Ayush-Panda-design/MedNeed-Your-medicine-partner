import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { reviewInput, reviewPrescription } from "@/server/prescriptions/service";

type Ctx = { params: Promise<{ id: string }> };

// Only a pharmacist (or admin) can approve, reject or query a prescription.
export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Prescription not found.");
  const body = await readJson(req, reviewInput);
  await reviewPrescription({ id: user.id, ip: clientIp(req) }, id, body);
  return ok({ updated: true });
});
