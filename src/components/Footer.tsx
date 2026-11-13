import Link from "next/link";
import type { Category } from "@/lib/catalog";
import { Logo } from "./Logo";

export function Footer({ categories }: { categories: Category[] }) {
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
            <li><span className="text-slate-500">About us (coming soon)</span></li>
            <li><a href="tel:+919437545411" className="hover:text-white">Call +91 94375 45411</a></li>
            <li><a href="mailto:medneed.services@gmail.com" className="break-all hover:text-white">medneed.services@gmail.com</a></li>
            <li className="text-slate-400">Open daily, 7:00 AM to 10:00 PM</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Legal</h3>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>Privacy policy (coming soon)</li>
            <li>Terms of use (coming soon)</li>
            <li>Refund &amp; return policy (coming soon)</li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">Drug licence no.: [to be added before launch]</p>
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
