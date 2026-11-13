"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/providers";

export function SignOutEverywhere() {
  const router = useRouter();
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await api("/api/auth/logout", { body: { all: true } });
        await auth.refresh();
        router.replace("/admin/login");
        router.refresh();
      }}
      className="mt-4 rounded-xl border border-rose-300 px-5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-70"
    >
      Sign out of all devices
    </button>
  );
}
