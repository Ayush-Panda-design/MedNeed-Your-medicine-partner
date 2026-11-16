import { handle, ok } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { markCustomerRead } from "@/server/chat/service";

export const POST = handle(async () => {
  const { userId } = await requireApiUser();
  await markCustomerRead(userId);
  return ok();
});
