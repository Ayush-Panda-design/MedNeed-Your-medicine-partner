import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { MAX_IMPORT_BYTES, runImport } from "@/server/catalog/import";

const schema = z.object({ csv: z.string().min(1, "Choose a CSV file"), commit: z.boolean() });

export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin", "pharmacist", "inventory_manager"]);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_IMPORT_BYTES + 1024) throw new ApiError(413, "The file is too large (3 MB maximum).");
  const { csv, commit } = await readJson(req, schema);
  if (csv.length > MAX_IMPORT_BYTES) throw new ApiError(413, "The file is too large (3 MB maximum).");
  return ok(await runImport({ id: user.id, ip: clientIp(req) }, csv, commit));
});
