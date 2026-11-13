import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { s3Config, uploadDir } from "@/server/env";
import { KEY_PATTERN, MIME_BY_EXT } from "@/server/catalog/storage";

// Serves locally stored product images (development, or a single server with a mounted disk).
// When S3 is configured, images are served from the S3/CDN URL instead and this route is unused.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (s3Config()) return new NextResponse("Not found", { status: 404 });
  const key = (await params).path.join("/");
  if (!KEY_PATTERN.test(key)) return new NextResponse("Not found", { status: 404 });
  try {
    const file = await fs.readFile(path.join(uploadDir(), key));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": MIME_BY_EXT[key.split(".").pop()!],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
