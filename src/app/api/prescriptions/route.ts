import { ApiError, clientIp, handle, ok } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { createPrescription, listUserPrescriptions, readUploads } from "@/server/prescriptions/service";
import { MAX_REQUEST_BYTES } from "@/server/prescriptions/storage";

/** The signed-in customer's own prescriptions. */
export const GET = handle(async () => {
  const claims = await requireApiUser();
  return ok({ items: await listUserPrescriptions(claims.userId) });
});

/** Upload a new prescription: one or more photos or PDFs, sent as a form. */
export const POST = handle(async (req) => {
  const claims = await requireApiUser();
  if (Number(req.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES) throw new ApiError(413, "The files are too large. Each file must be 5 MB or smaller.", "file_too_large");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Upload the prescription as a form file.");
  }
  const files = await readUploads(form);
  const text = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : "");
  const created = await createPrescription({ id: claims.userId }, { patientName: text("patientName"), doctorName: text("doctorName"), note: text("note") }, files, clientIp(req));
  return ok(created, { status: 201 });
});
