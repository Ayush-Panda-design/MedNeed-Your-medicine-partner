import type { Metadata } from "next";
import { googleConfig, isProd, smsDriver } from "@/server/env";
import { captchaSiteKey } from "@/server/security/captcha";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };
// Reads env at request time so Google sign-in can be switched on without rebuilding.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  // Mobile OTP is offered only when texts can really be sent (a real SMS provider, or the dev console while developing).
  const smsEnabled = !isProd() || smsDriver() !== "console";
  return <LoginForm googleEnabled={Boolean(googleConfig())} smsEnabled={smsEnabled} captchaSiteKey={captchaSiteKey()} />;
}
