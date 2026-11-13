import os from "node:os";
import path from "node:path";

// All config is read lazily so `next build` never needs production secrets.

const DEV_SECRET = "dev-only-insecure-secret-do-not-use-in-production-0123456789";
let warned = false;

export const isProd = () => process.env.NODE_ENV === "production";

export function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (isProd()) throw new Error("AUTH_SECRET must be set (at least 32 characters) in production.");
  if (!warned) {
    warned = true;
    console.warn("[auth] AUTH_SECRET is not set. Using an insecure development secret.");
  }
  return DEV_SECRET;
}

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const databaseUrl = () => process.env.DATABASE_URL || undefined;

// Dev database lives outside the project so OneDrive does not sync live database files.
export const pgliteDir = () => process.env.PGLITE_DIR || path.join(os.homedir(), ".medneed", "pglite");

export const googleConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
};

export const smsDriver = () => process.env.SMS_DRIVER ?? "console";

// Product image storage. Development writes to a local folder (outside the project, so OneDrive ignores it).
// Production should use S3 (or any S3-compatible store such as Cloudflare R2 or MinIO).
export const uploadDir = () => process.env.UPLOAD_DIR || path.join(os.homedir(), ".medneed", "uploads");
export const s3Config = () => {
  const bucket = process.env.S3_BUCKET;
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (!bucket || !publicUrl) return null;
  return {
    bucket,
    region: process.env.S3_REGION || "ap-south-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || undefined,
    publicUrl: publicUrl.replace(/\/$/, ""),
  };
};
