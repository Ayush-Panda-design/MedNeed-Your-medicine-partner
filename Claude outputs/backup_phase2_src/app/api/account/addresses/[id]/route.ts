import { handle, ok, readJson, ApiError } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { addressSchema, deleteAddress, updateAddress } from "@/server/auth/addresses";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function idOf(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw new ApiError(404, "Address not found.");
  return id;
}

export const PATCH = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const claims = await requireApiUser();
  const id = await idOf(ctx);
  return ok({ address: await updateAddress(claims.userId, id, await readJson(req, addressSchema)) });
});

export const DELETE = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const claims = await requireApiUser();
  await deleteAddress(claims.userId, await idOf(ctx));
  return ok();
});
