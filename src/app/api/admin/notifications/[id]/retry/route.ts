import { ApiError, clientIp, handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { retryNotification } from "@/server/notifications/queue";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin"]);
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) throw new ApiError(404, "Message not found.");
  await retryNotification({ id: user.id, ip: clientIp(req) }, Number(id));
  return ok({ queued: true });
});
