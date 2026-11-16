import { z } from "zod";
import { ApiError, handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { markStaffRead } from "@/server/chat/service";

export const POST = handle<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  await requireApiStaff(["admin", "pharmacist"]);
  const id = z.string().uuid().safeParse((await ctx.params).id);
  if (!id.success) throw new ApiError(404, "That conversation was not found.");
  await markStaffRead(id.data);
  return ok();
});
