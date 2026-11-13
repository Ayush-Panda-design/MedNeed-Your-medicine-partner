import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthCard title="Forgot your password?">
      <ForgotForm initialEmail={typeof email === "string" ? email.slice(0, 254) : ""} />
    </AuthCard>
  );
}
