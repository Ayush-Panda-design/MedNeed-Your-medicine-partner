import Link from "next/link";
import { Cross } from "lucide-react";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="MedNeed home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 text-white shadow-sm">
        <Cross className="h-5 w-5" strokeWidth={3} />
      </span>
      <span className={`text-xl font-bold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
        Med<span className={light ? "text-teal-200" : "text-teal-600"}>Need</span>
      </span>
    </Link>
  );
}
