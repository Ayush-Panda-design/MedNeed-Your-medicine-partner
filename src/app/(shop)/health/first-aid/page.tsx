import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { EMERGENCY_SIGNS } from "@/lib/health/firstAid";
import { EmergencyBanner, FirstAidGrid, HealthDisclaimer, HealthShell } from "@/components/health/HealthBits";
import { StethoArt } from "@/components/health/HealthArt";

export const metadata: Metadata = {
  title: "First-aid guides",
  description: "Quick first-aid steps for burns, cuts, nosebleeds, sprains, fever, heat stroke, insect stings, diarrhoea and snake bite, and the signs that mean you need help now.",
  alternates: { canonical: "/health/first-aid" },
};

export default function FirstAidIndex() {
  return (
    <HealthShell>
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <header className="relative grid items-center gap-2 md:grid-cols-[1fr_auto]">
          <div className="max-w-3xl">
            <Link href="/health" className="hh-eyebrow"><BookOpen className="h-4 w-4" aria-hidden="true" /> Health hub</Link>
            <h1 className="hh-title mt-5 text-[2.5rem] sm:text-5xl lg:text-[3.4rem]">First-aid guides</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: "var(--hh-ink2)" }}>Quick steps for common minor injuries and illnesses, and the signs that mean you need help now.</p>
            <span aria-hidden="true" className="mt-4 block h-[3px] w-14 rounded-full" style={{ background: "var(--hh-accent)" }} />
          </div>
          <StethoArt className="mx-auto h-40 w-auto sm:h-48 md:h-56" />
        </header>

        <div className="mt-8"><EmergencyBanner title="Call 112 (ambulance 108) straight away for" items={EMERGENCY_SIGNS} twoColumns /></div>
        <div className="mt-6"><FirstAidGrid /></div>
        <div className="mt-10"><HealthDisclaimer /></div>
      </main>
    </HealthShell>
  );
}
