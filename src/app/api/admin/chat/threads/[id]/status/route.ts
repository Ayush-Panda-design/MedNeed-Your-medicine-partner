import { z } from "zod";
import { ApiError, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { setThreadStatus } from "@/server/chat/service";

export const POST = handle<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const id = z.string().uuid().safeParse((await ctx.params).id);
  if (!id.success) throw new ApiError(404, "That conversation was not found.");
  const { status } = await readJson(req, z.object({ status: z.enum(["open", "closed"]) }));
  await setThreadStatus(user.id, id.data, status);
  return ok();
});
