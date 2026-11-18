import type { ReactNode } from "react";
import Image from "next/image";
import { Logo } from "@/components/Logo";
import "./auth.css";

/** Centred card (same green scene as the sign-in page) used by the password-reset and email-verification pages. */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="au au-simple">
      <div className="au-bg" aria-hidden />
      <Image src="/auth/leaves-tr-v2.webp" alt="" width={381} height={266} className="au-leaf-tr" />
      <Image src="/auth/leaves-bl.webp" alt="" width={280} height={288} className="au-leaf-bl" />
      <div className="au-simple-wrap">
        {/* Logo is itself a link to the home page. */}
        <div className="au-simple-logo"><Logo /></div>
        <div className="au-card">
          <h1 className="au-simple-title">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
