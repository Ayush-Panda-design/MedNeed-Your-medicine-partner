import { z } from "zod";
import { ApiError, clientIp, handle, ok } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { withdrawPrescription } from "@/server/prescriptions/service";

type Ctx = { params: Promise<{ id: string }> };

/** Remove a prescription that no order depends on. */
export const DELETE = handle<Ctx>(async (req, { params }) => {
  const claims = await requireApiUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Prescription not found.");
  await withdrawPrescription({ id: claims.userId }, id, clientIp(req));
  return ok({ removed: true });
});
