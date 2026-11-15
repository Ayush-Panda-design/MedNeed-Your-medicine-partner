import { BadgeCheck, Clock, IndianRupee, ShieldCheck, Truck, UserCheck } from "lucide-react";

const ITEMS = [
  { icon: BadgeCheck, t: "100% genuine medicines" },
  { icon: UserCheck, t: "Pharmacist-verified orders" },
  { icon: Truck, t: "Home delivery across Bhubaneswar" },
  { icon: IndianRupee, t: "Never above MRP" },
  { icon: ShieldCheck, t: "Encrypted prescriptions" },
  { icon: Clock, t: "Open 7 AM – 10 PM, every day" },
];

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="mn-marquee-row" aria-hidden={hidden || undefined}>
      {ITEMS.map((it) => (
        <li key={it.t} className="flex shrink-0 items-center gap-2">
          <it.icon className="h-4 w-4 text-lime-300" aria-hidden />
          <span>{it.t}</span>
          <span aria-hidden className="ml-6 h-1.5 w-1.5 rounded-full bg-white/35" />
        </li>
      ))}
    </ul>
  );
}

/** A slow, endless band of MedNeed's promises. Pure CSS; pauses on hover; static and swipeable with reduced motion. */
export function PromiseBand() {
  return (
    <section aria-label="Our promises" className="mn-marquee bg-gradient-to-r from-teal-800 via-teal-700 to-teal-800 py-3.5 text-sm font-medium text-white">
      <div className="mn-marquee-track">
        <Row />
        <Row hidden />
      </div>
    </section>
  );
}
