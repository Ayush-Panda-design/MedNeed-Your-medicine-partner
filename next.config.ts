import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content Security Policy. Production only: the dev server needs eval for hot reload.
// 'unsafe-inline' scripts are required by the inline theme script and Next's own bootstrap scripts.
// Razorpay Checkout loads a script from checkout.razorpay.com and opens its payment form in a frame from api.razorpay.com.
// Cloudflare Turnstile (optional bot check on OTP sign-in) loads a script and a frame from challenges.cloudflare.com.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.razorpay.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://challenges.cloudflare.com",
  "frame-ancestors 'self'",
  "form-action 'self' https://*.razorpay.com https://accounts.google.com",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // SAMEORIGIN, not DENY: the admin prescription viewer frames our own PDF route.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera for prescription photos and barcode scanning, location for the delivery pin and the delivery app.
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), payment=(self \"https://api.razorpay.com\")" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server bundle for the Docker image (.next/standalone).
  output: "standalone",
  // Loaded by Node at runtime instead of being bundled (pg and PGlite ship WASM/optional native paths).
  serverExternalPackages: ["pg", "@electric-sql/pglite", "@aws-sdk/client-s3"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
