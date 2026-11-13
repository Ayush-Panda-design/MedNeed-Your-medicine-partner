import { loadS3 } from "../s3";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { isProd, prescriptionDir, prescriptionKey, prescriptionS3 } from "../env";
import { ApiError } from "../http";
import { sniffImage } from "../catalog/storage";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 5;
export const MAX_REQUEST_BYTES = MAX_FILE_BYTES * MAX_FILES_PER_UPLOAD + 256 * 1024;

export type Sniffed = { ext: "jpg" | "png" | "webp" | "pdf"; mime: string };

/** The file type comes from the first bytes. The browser's file name and type are never trusted. SVG and anything else is refused. */
export function sniffPrescription(buf: Buffer): Sniffed | null {
  if (buf.length > 8 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return { ext: "pdf", mime: "application/pdf" };
  const img = sniffImage(buf);
  return img ? { ext: img.ext, mime: img.mime } : null;
}

const KEY_PATTERN = /^rx\/\d{4}\/[a-f0-9]{32}\.(jpg|png|webp|pdf)$/;

/* ---- optional encryption at rest: iv (12) + tag (16) + ciphertext ---- */
function seal(buf: Buffer): Buffer {
  const key = prescriptionKey();
  if (!key) return buf;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]);
}
function unseal(buf: Buffer): Buffer {
  const key = prescriptionKey();
  if (!key) return buf;
  const d = crypto.createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]);
}

function assertConfigured() {
  if (isProd() && !prescriptionKey()) throw new ApiError(503, "Prescription storage is not configured. Set PRESCRIPTION_ENC_KEY.", "storage_unconfigured");
  if (isProd() && !prescriptionS3() && !process.env.PRESCRIPTION_DIR) throw new ApiError(503, "Prescription storage is not configured. Set PRESCRIPTION_S3_BUCKET or PRESCRIPTION_DIR.", "storage_unconfigured");
}

async function s3() {
  const cfg = prescriptionS3();
  if (!cfg) return null;
  const { S3Client } = await loadS3();
  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: Boolean(cfg.endpoint),
    credentials: cfg.accessKeyId && cfg.secretAccessKey ? { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey } : undefined,
  });
  return { client, bucket: cfg.bucket };
}

/** Stores one file privately and returns its key. */
export async function putPrescriptionFile(buf: Buffer, kind: Sniffed): Promise<string> {
  assertConfigured();
  const key = `rx/${new Date().getUTCFullYear()}/${crypto.randomBytes(16).toString("hex")}.${kind.ext}`;
  const body = seal(buf);
  const remote = await s3();
  if (remote) {
    const { PutObjectCommand } = await loadS3();
    await remote.client.send(new PutObjectCommand({ Bucket: remote.bucket, Key: key, Body: body, ContentType: "application/octet-stream", CacheControl: "private, no-store" }));
    return key;
  }
  const file = path.join(prescriptionDir(), key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body, { flag: "wx", mode: 0o600 });
  return key;
}

export async function getPrescriptionFile(key: string): Promise<Buffer> {
  if (!KEY_PATTERN.test(key)) throw new ApiError(404, "File not found.");
  const remote = await s3();
  if (remote) {
    const { GetObjectCommand } = await loadS3();
    const out = await remote.client.send(new GetObjectCommand({ Bucket: remote.bucket, Key: key }));
    return unseal(Buffer.from(await (out.Body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray()));
  }
  try {
    return unseal(await fs.readFile(path.join(prescriptionDir(), key)));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") throw new ApiError(404, "File not found.");
    throw e;
  }
}

/** Best effort: a file that cannot be removed is logged, never allowed to break the request. */
export async function deletePrescriptionFile(key: string) {
  if (!KEY_PATTERN.test(key)) return;
  try {
    const remote = await s3();
    if (remote) {
      const { DeleteObjectCommand } = await loadS3();
      await remote.client.send(new DeleteObjectCommand({ Bucket: remote.bucket, Key: key }));
    } else await fs.rm(path.join(prescriptionDir(), key), { force: true });
  } catch (e) {
    console.error("[prescriptions] could not delete file", key, e);
  }
}

export type IncomingFile = { buf: Buffer; kind: Sniffed; sha256: string };

/** Reads and checks every uploaded file before anything is stored. */
export async function readUploads(form: FormData, field = "files"): Promise<IncomingFile[]> {
  const files = form.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) throw new ApiError(400, "Choose a photo or PDF of the prescription.", "no_file");
  if (files.length > MAX_FILES_PER_UPLOAD) throw new ApiError(400, `You can upload at most ${MAX_FILES_PER_UPLOAD} files at a time.`, "too_many_files");
  const out: IncomingFile[] = [];
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) throw new ApiError(413, "Each file must be 5 MB or smaller.", "file_too_large");
    const buf = Buffer.from(await f.arrayBuffer());
    const kind = sniffPrescription(buf);
    if (!kind) throw new ApiError(400, "Upload a JPEG, PNG or WebP photo, or a PDF.", "bad_file_type");
    out.push({ buf, kind, sha256: crypto.createHash("sha256").update(buf).digest("hex") });
  }
  return out;
}
