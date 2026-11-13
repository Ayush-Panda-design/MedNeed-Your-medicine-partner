import { ApiError, handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { audit } from "@/server/auth/users";
import { clientIp } from "@/server/http";
import { MAX_IMAGE_BYTES, saveMedicineImage } from "@/server/catalog/storage";

export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin", "pharmacist", "inventory_manager"]);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES + 64 * 1024) throw new ApiError(413, "Image is too large. Maximum size is 2 MB.");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Upload the image as a form file.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Choose an image to upload.");
  const url = await saveMedicineImage(Buffer.from(await file.arrayBuffer()));
  await audit(user.id, "catalog.image.uploaded", { url, bytes: file.size }, clientIp(req));
  return ok({ url }, { status: 201 });
});
