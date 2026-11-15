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
/**
 * Postgres connection string. DATABASE_URL is the standard name; POSTGRES_URL is what some hosting integrations
 * (Vercel Postgres, Supabase) set instead, so either works.
 */
export const databaseUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;

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

// Prescription files are health records: always private. Development writes to a local folder outside the project.
// Production: a private S3 bucket (PRESCRIPTION_S3_BUCKET, never public) or a persistent private folder (PRESCRIPTION_DIR).
// PRESCRIPTION_ENC_KEY (64 hex characters) encrypts every file before it is stored. It is required in production.
export const prescriptionDir = () => process.env.PRESCRIPTION_DIR || path.join(os.homedir(), ".medneed", "prescriptions");
export const prescriptionS3 = () => {
  const bucket = process.env.PRESCRIPTION_S3_BUCKET;
  if (!bucket) return null;
  return {
    bucket,
    region: process.env.S3_REGION || "ap-south-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || undefined,
  };
};
export const prescriptionKey = (): Buffer | null => {
  const hex = process.env.PRESCRIPTION_ENC_KEY;
  if (!hex) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error("PRESCRIPTION_ENC_KEY must be 64 hex characters (32 bytes).");
  return Buffer.from(hex, "hex");
};

// Customer messages. Each channel has a driver; "console" prints to the server terminal and works in development only.
//  Email:     EMAIL_DRIVER = console | resend | brevo   (+ EMAIL_FROM, RESEND_API_KEY or BREVO_API_KEY)
//  SMS:       SMS_DRIVER   = console | twilio           (see server/auth/sms.ts; India needs DLT-registered templates)
//  WhatsApp:  WHATSAPP_DRIVER = console | cloud          (+ WHATSAPP_TOKEN, WHATSAPP_PHONE_ID; every message is a Meta-approved template)
export const emailDriver = () => process.env.EMAIL_DRIVER ?? (isProd() ? "none" : "console");
export const whatsappDriver = () => process.env.WHATSAPP_DRIVER ?? (isProd() ? "none" : "console");

// AI (Google Gemini). Free-tier keys are rate-limited per key, so several keys are rotated and responses cached.
//   GEMINI_API_KEYS=key1,key2,key3   (or a single GEMINI_API_KEY)
//   GEMINI_MODEL (default gemini-flash-latest, Google's always-current Flash alias), GEMINI_API_BASE (override for tests).
//   If a model name is retired, calls fall back through GEMINI_FALLBACK_MODELS (comma-separated).
export const geminiKeys = () =>
  (process.env.GEMINI_API_KEYS ?? process.env.GEMINI_API_KEY ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
export const aiEnabled = () => geminiKeys().length > 0;
export const geminiModel = () => process.env.GEMINI_MODEL || "gemini-flash-latest";
export const geminiFallbackModels = () =>
  (process.env.GEMINI_FALLBACK_MODELS || "gemini-flash-latest,gemini-3.5-flash,gemini-2.5-flash").split(",").map((s) => s.trim()).filter(Boolean);
// Vision (prescription reading) can use a different model if set; defaults to the main model, which on Gemini's flash tier is multimodal.
export const geminiVisionModel = () => process.env.GEMINI_VISION_MODEL ?? geminiModel();
// Embeddings model for semantic search. text-embedding-004 was retired by Google (Jan 2026); gemini-embedding-001 replaces it.
// Vectors are requested at EMBED_DIM dimensions (the model's native size is larger) to keep storage and search fast.
export const geminiEmbedModel = () => process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001";
export const EMBED_DIM = 768;
export const geminiBase = () => process.env.GEMINI_API_BASE ?? "https://generativelanguage.googleapis.com";
