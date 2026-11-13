import type { Metadata } from "next";
import { googleConfig } from "@/server/env";
import { captchaSiteKey } from "@/server/security/captcha";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };
// Reads env at request time so Google sign-in can be switched on without rebuilding.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm googleEnabled={Boolean(googleConfig())} captchaSiteKey={captchaSiteKey()} />;
}
