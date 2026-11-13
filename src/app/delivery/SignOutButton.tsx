"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/providers";

export function SignOutButton() {
  const auth = useAuth();
  const router = useRouter();
  return (
    <button onClick={async () => { await auth.signOut(); router.replace("/login"); router.refresh(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"><LogOut className="h-4 w-4" /> Sign out</button>
  );
}
