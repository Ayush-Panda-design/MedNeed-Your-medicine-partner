import { clientIp, handle, ok, readJson } from "@/server/http";
import { createRequest, requestInput } from "@/server/catalog/requests";

export const POST = handle(async (req) => {
  const body = await readJson(req, requestInput);
  const out = await createRequest(body, clientIp(req));
  return ok({ received: true, duplicate: out.duplicate }, { status: 201 });
});
