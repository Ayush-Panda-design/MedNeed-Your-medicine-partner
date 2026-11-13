/* eslint-disable @typescript-eslint/no-explicit-any */
// The S3 library is optional (only needed when a bucket is configured). Loading it by a variable name keeps the
// bundler from requiring it at build time, so the app builds and runs without it until S3 is actually used.
export async function loadS3(): Promise<any> {
  const name = "@aws-sdk/client-s3";
  try {
    return await import(/* webpackIgnore: true */ name);
  } catch {
    throw new Error("S3 storage is configured but the @aws-sdk/client-s3 package is not installed. Run npm install.");
  }
}
