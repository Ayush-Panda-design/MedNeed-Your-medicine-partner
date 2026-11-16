/* eslint-disable @typescript-eslint/no-explicit-any */
// The S3 library is loaded only when a bucket is configured. The import uses a plain string so Vercel's file tracing
// includes the package in the deployed function (a variable name hides it and the upload then fails in production).
export async function loadS3(): Promise<any> {
  try {
    return await import("@aws-sdk/client-s3");
  } catch (e) {
    console.error("[s3] could not load @aws-sdk/client-s3", e);
    throw new Error("S3 storage is configured but the @aws-sdk/client-s3 package could not be loaded.");
  }
}

/** Options shared by every S3 client. Checksums only when the server requires them: Backblaze B2 and other S3-compatible stores reject the SDK's newer default checksum headers. */
export const S3_COMPAT = { requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" } as const;
