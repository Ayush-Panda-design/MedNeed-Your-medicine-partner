import { handle, ok, readJson } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { addressSchema, createAddress, listAddresses } from "@/server/auth/addresses";

export const GET = handle(async () => {
  const claims = await requireApiUser();
  return ok({ addresses: await listAddresses(claims.userId) });
});

export const POST = handle(async (req) => {
  const claims = await requireApiUser();
  const address = await createAddress(claims.userId, await readJson(req, addressSchema));
  return ok({ address }, { status: 201 });
});
