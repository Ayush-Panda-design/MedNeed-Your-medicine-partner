import { z } from "zod";
import { ApiError, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { sendStaffMessage } from "@/server/chat/service";

const schema = z.object({ body: z.string().min(1, "Please type a message.").max(4000), clientId: z.string().min(8).max(64).optional() });

export const POST = handle<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const id = z.string().uuid().safeParse((await ctx.params).id);
  if (!id.success) throw new ApiError(404, "That conversation was not found.");
  const input = await readJson(req, schema);
  return ok({ message: await sendStaffMessage(user.id, id.data, input.body, input.clientId) }, { headers: { "Cache-Control": "no-store" } });
});
