import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { addPartner, listPartners, partnerInput } from "@/server/orders/fulfilment";

export const GET = handle(async () => {
  await requireApiStaff(["admin", "pharmacist"]);
  return ok({ partners: await listPartners() }, { headers: { "Cache-Control": "no-store" } });
});

export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin"]);
  const input = await readJson(req, partnerInput);
  return ok(await addPartner({ id: user.id, ip: clientIp(req) }, input));
});
