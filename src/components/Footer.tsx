import Link from "next/link";
import type { Category } from "@/lib/catalog";
import type { BusinessInfo } from "@/server/orders/settings";
import { Logo } from "./Logo";

type FooterBusiness = Pick<BusinessInfo, "legalName" | "phone" | "email" | "hoursLabel" | "drugLicense" | "gstin" | "pharmacistName" | "pharmacistRegNo">;

export function Footer({ categories, business: b }: { categories: Category[]; business: FooterBusiness }) {
  const tel = b.phone.replace(/[^\d+]/g, "");
  const legal = [
    { href: "/privacy", label: "Privacy policy" },
    { href: "/terms", label: "Terms of use" },
    { href: "/refunds", label: "Cancellation & refunds" },
    { href: "/shipping", label: "Shipping & delivery" },
  ];
  return (
    <footer className="mt-20 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="space-y-4">
          <Logo light tagline />
          <p className="text-sm leading-relaxed text-slate-400">
            Genuine medicines and health products, delivered to your doorstep. Prescription medicines are dispensed only after verification by a registered pharmacist.
          </p>
          <p className="text-xs leading-relaxed text-slate-500">Two branches: Nakhara, DPS Road (751032) and Rudhrapur, Puri Canal Road (751035), Bhubaneswar.</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Shop</h3>
          <ul className="space-y-2 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={`/medicines?category=${c.slug}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Company</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/medicines" className="hover:text-white">All medicines</Link></li>
            <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
            <li><Link href="/cart" className="hover:text-white">Cart</Link></li>
            <li><Link href="/about" className="hover:text-white">About us</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact us</Link></li>
            {b.phone && <li><a href={`tel:${tel.startsWith("+") ? tel : `+91${tel}`}`} className="hover:text-white">Call {b.phone}</a></li>}
            {b.email && <li><a href={`mailto:${b.email}`} className="break-all hover:text-white">{b.email}</a></li>}
            <li className="text-slate-400">Open daily, {b.hoursLabel}</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Legal</h3>
          <ul className="space-y-2 text-sm">
            {legal.map((l) => (
              <li key={l.href}><Link href={l.href} className="hover:text-white">{l.label}</Link></li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 text-xs text-slate-500">
            <div>{b.legalName}</div>
            <div>Drug licence no.: {b.drugLicense || "to be added"}</div>
            {b.gstin && <div>GSTIN: {b.gstin}</div>}
            {b.pharmacistName && <div>Pharmacist: {b.pharmacistName}{b.pharmacistRegNo ? ` (Reg. ${b.pharmacistRegNo})` : ""}</div>}
          </dl>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-slate-500 sm:px-6">
          © {new Date().getFullYear()} MedNeed. The information on this site is for general awareness and is not a substitute for professional medical advice. Always consult a doctor or pharmacist before taking any medicine.
        </p>
      </div>
    </footer>
  );
}
