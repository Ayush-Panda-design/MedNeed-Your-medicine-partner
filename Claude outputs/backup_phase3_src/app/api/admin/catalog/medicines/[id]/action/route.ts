import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { applyAction } from "@/server/catalog/repo";
import { ACTIONS } from "@/server/catalog/schema";

// Verifying and publishing are pharmacist/admin decisions.
export const POST = handle<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const { id } = await params;
  const { action } = await readJson(req, z.object({ action: z.enum(ACTIONS) }));
  const medicine = await applyAction({ id: user.id, ip: clientIp(req) }, id, action);
  return ok({ medicine });
});
