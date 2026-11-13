import { z } from "zod";
import { handle, ok, readJson } from "@/server/http";
import { beginEnrollment, requirePending } from "@/server/auth/admin2fa";

export const POST = handle(async (req) => {
  const { pendingToken } = await readJson(req, z.object({ pendingToken: z.string().min(10) }));
  const user = await requirePending(pendingToken);
  return ok(await beginEnrollment(user));
});
