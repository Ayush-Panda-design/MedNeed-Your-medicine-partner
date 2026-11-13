import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { getUserById } from "@/server/auth/users";
import { placeOrder, placeOrderInput } from "@/server/orders/place";

export const POST = handle(async (req) => {
  const claims = await requireApiUser();
  const user = await getUserById(claims.userId);
  if (!user) return ok({ error: "Please sign in again." }, { status: 401 });
  const input = await readJson(req, placeOrderInput);
  const placed = await placeOrder({ id: user.id, name: user.name, phone: user.phone }, input, clientIp(req));
  return ok(placed, { status: placed.replayed ? 200 : 201 });
});
