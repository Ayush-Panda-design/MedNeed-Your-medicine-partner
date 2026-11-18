import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { runStoreImport, storeItemCount } from "@/server/catalog/store-items";

export const maxDuration = 60;

const schema = z.object({ commit: z.boolean() });

/** Admin only. commit = false is a preview: everything runs inside a transaction that is rolled back. */
export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin"]);
  const { commit } = await readJson(req, schema);
  return ok(await runStoreImport({ id: user.id, ip: clientIp(req) }, commit));
});

export const GET = handle(async () => {
  await requireApiStaff(["admin"]);
  return ok({ items: storeItemCount });
});
