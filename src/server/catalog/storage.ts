import { loadS3 } from "../s3";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { isProd, s3Config, uploadDir } from "../env";
import { ApiError } from "../http";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type Kind = { ext: "jpg" | "png" | "webp"; mime: string };

/** Identify the image from its first bytes. The browser-supplied type and file name are never trusted. SVG is refused (it can carry scripts). */
export function sniffImage(buf: Buffer): Kind | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

export const MIME_BY_EXT: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
export const KEY_PATTERN = /^medicines\/\d{4}\/[a-f0-9]{32}\.(jpg|png|webp)$/;

/** Stores the image and returns the public URL to save on the medicine. */
export async function saveMedicineImage(buf: Buffer): Promise<string> {
  if (buf.length === 0) throw new ApiError(400, "The file is empty.");
  if (buf.length > MAX_IMAGE_BYTES) throw new ApiError(413, "Image is too large. Maximum size is 2 MB.");
  const kind = sniffImage(buf);
  if (!kind) throw new ApiError(400, "Upload a JPEG, PNG or WebP image.");

  const key = `medicines/${new Date().getUTCFullYear()}/${crypto.randomBytes(16).toString("hex")}.${kind.ext}`;
  const s3 = s3Config();

  if (s3) {
    const { S3Client, PutObjectCommand } = await loadS3();
    const client = new S3Client({
      region: s3.region,
      endpoint: s3.endpoint,
      forcePathStyle: Boolean(s3.endpoint),
      credentials: s3.accessKeyId && s3.secretAccessKey ? { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey } : undefined,
    });
    await client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: key,
        Body: buf,
        ContentType: kind.mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${s3.publicUrl}/${key}`;
  }

  if (isProd() && !process.env.UPLOAD_DIR) {
    throw new ApiError(503, "Image storage is not configured. Set S3_BUCKET and S3_PUBLIC_URL.", "storage_unconfigured");
  }
  const file = path.join(uploadDir(), key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buf, { flag: "wx" });
  return `/media/${key}`;
}

/** Only URLs this app produced may be stored on a medicine, so a hostile value can never point at someone else's server. */
export function isAllowedImageUrl(url: string) {
  if (url.startsWith("/media/")) return KEY_PATTERN.test(url.slice("/media/".length));
  const s3 = s3Config();
  return Boolean(s3 && url.startsWith(`${s3.publicUrl}/`) && KEY_PATTERN.test(url.slice(s3.publicUrl.length + 1)));
}
