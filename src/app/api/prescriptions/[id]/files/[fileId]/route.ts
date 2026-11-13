import { z } from "zod";
import { ApiError, clientIp, handle } from "@/server/http";
import { checkStaff, getClaims } from "@/server/auth/session";
import { audit } from "@/server/auth/users";
import { getFileForViewer } from "@/server/prescriptions/service";
import { getPrescriptionFile } from "@/server/prescriptions/storage";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/**
 * The only way to read a prescription file. The owner, or a pharmacist/admin who has completed two-factor sign-in, can open it.
 * Anyone else gets "not found", the same as a file that does not exist. Never cached.
 */
export const GET = handle<Ctx>(async (req, { params }) => {
  const { id, fileId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(fileId).success) throw new ApiError(404, "File not found.");
  const claims = await getClaims();
  if (!claims) throw new ApiError(401, "Please sign in to continue.", "unauthenticated");
  const staff = (await checkStaff(claims, ["admin", "pharmacist"])).ok;
  const file = await getFileForViewer(id, fileId, { userId: claims.userId, staff });
  if (!file) throw new ApiError(404, "File not found.");
  const buf = await getPrescriptionFile(file.key);
  if (staff) await audit(claims.userId, "prescriptions.file.viewed", { id, fileId }, clientIp(req));
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(buf.length),
      "Content-Disposition": `inline; filename="prescription-${file.position + 1}.${EXT[file.mime] ?? "bin"}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
});
