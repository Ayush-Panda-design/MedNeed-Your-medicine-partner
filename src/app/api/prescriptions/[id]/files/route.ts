import { z } from "zod";
import { ApiError, clientIp, handle, ok } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { addToPrescription, readUploads } from "@/server/prescriptions/service";
import { MAX_REQUEST_BYTES } from "@/server/prescriptions/storage";

type Ctx = { params: Promise<{ id: string }> };

/** Add more pages and/or answer the pharmacist's question. The prescription goes back into the review queue. */
export const POST = handle<Ctx>(async (req, { params }) => {
  const claims = await requireApiUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Prescription not found.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES) throw new ApiError(413, "The files are too large. Each file must be 5 MB or smaller.", "file_too_large");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Upload the files as a form.");
  }
  const hasFiles = form.getAll("files").some((f) => f instanceof File && f.size > 0);
  const files = hasFiles ? await readUploads(form) : null;
  const note = typeof form.get("note") === "string" ? (form.get("note") as string) : "";
  await addToPrescription({ id: claims.userId }, id, files, note, clientIp(req));
  return ok({ updated: true });
});
