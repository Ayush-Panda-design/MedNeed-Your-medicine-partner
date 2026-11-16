import { z } from "zod";
import { ApiError, handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { getThreadForStaff, listMessages } from "@/server/chat/service";

export const dynamic = "force-dynamic";
const uuid = z.string().uuid();

export const GET = handle<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await requireApiStaff(["admin", "pharmacist"]);
  const id = uuid.safeParse((await ctx.params).id);
  if (!id.success) throw new ApiError(404, "That conversation was not found.");
  const thread = await getThreadForStaff(id.data);
  if (!thread) throw new ApiError(404, "That conversation was not found.");
  const after = Math.max(0, Number(req.nextUrl.searchParams.get("after")) || 0);
  return ok({ thread, messages: await listMessages(id.data, after) }, { headers: { "Cache-Control": "no-store" } });
});
