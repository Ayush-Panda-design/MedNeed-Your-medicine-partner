import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  PackageCheck,
  ShieldCheck,
  Truck,
  Upload,
  UserCheck,
} from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ProductCard } from "@/components/ProductCard";
import { categories, discountPercent, healthConcerns, products } from "@/lib/data";

const deals = [...products].filter((p) => p.inStock).sort((a, b) => discountPercent(b) - discountPercent(a)).slice(0, 4);
const bestSellers = [...products].filter((p) => p.inStock).sort((a, b) => b.reviews - a.reviews).slice(0, 8);

const faqs = [
  {
    q: "Do I need a prescription to order?",
    a: "Only for prescription medicines (marked Rx). Upload a valid prescription from a registered doctor and our pharmacist will verify it before your order is packed. Over-the-counter products can be ordered directly.",
  },
  {
    q: "How fast will my order arrive?",
    a: "Delivery times depend on your pincode and the time of order. You will see the estimated delivery slot at checkout.",
  },
  {
    q: "Are the medicines genuine?",
    a: "We source from licensed distributors and manufacturers. Every order is checked by a pharmacist, and batch and expiry details are verified before dispatch.",
  },
  {
    q: "Can I return or cancel an order?",
    a: "You can cancel before dispatch. Because of safety rules, medicines can be returned only if they are damaged, expired or incorrect. Full policy details will be published before launch.",
  },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4" /> Pharmacist-verified orders
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Your medicines, <br className="hidden sm:block" />
              delivered to your door.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-teal-50">
              Order prescription and everyday health products from a licensed pharmacy. Upload your prescription, we do the rest.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/medicines" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-teal-700 shadow-lg transition hover:bg-teal-50">
                Order medicines <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#upload" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
                <Upload className="h-4 w-4" /> Upload prescription
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-teal-50">
              <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> 100% genuine products</li>
              <li className="flex items-center gap-2"><Truck className="h-4 w-4" /> Free delivery above ₹499</li>
              <li className="flex items-center gap-2"><Lock className="h-4 w-4" /> Secure payments</li>
            </ul>
          </div>

          <div className="hidden md:block">
            <div className="rounded-3xl bg-white/10 p-6 shadow-2xl ring-1 ring-white/20 backdrop-blur">
              <p className="mb-4 text-sm font-semibold text-teal-50">Popular right now</p>
              <ul className="space-y-3">
                {bestSellers.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <Link href={`/medicines/${p.slug}`} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-sm transition hover:shadow-md">
                      <span>
                        <span className="block text-sm font-semibold">{p.name}</span>
                        <span className="block text-xs text-slate-500">{p.packSize}</span>
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold text-teal-700">
                        ₹{p.price} <ChevronRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Shop by category</h2>
            <p className="text-sm text-slate-500">Everything for your family&apos;s health in one place</p>
          </div>
          <Link href="/medicines" className="hidden items-center gap-1 text-sm font-semibold text-teal-700 hover:underline sm:flex">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/medicines?category=${c.slug}`}
                className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-center transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-600 transition group-hover:bg-teal-600 group-hover:text-white">
                  <CategoryIcon name={c.icon} className="h-7 w-7" />
                </span>
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="text-xs text-slate-500">{c.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Upload prescription */}
      <section id="upload" className="mx-auto mt-14 max-w-7xl scroll-mt-40 px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-slate-900 text-white">
          <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-200">
                <FileText className="h-4 w-4" /> Have a prescription?
              </span>
              <h2 className="mt-4 text-3xl font-bold">Order in three simple steps</h2>
              <p className="mt-3 max-w-md text-slate-300">
                Upload a photo of your doctor&apos;s prescription. A registered pharmacist verifies it and your order is on its way.
              </p>
              <Link href="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-400">
                <Upload className="h-4 w-4" /> Upload prescription
              </Link>
              <p className="mt-3 text-xs text-slate-400">Prescription upload goes live in Phase 7 of the roadmap.</p>
            </div>
            <ol className="space-y-4">
              {[
                { icon: Upload, t: "Upload", d: "Take a clear photo of your prescription and upload it." },
                { icon: UserCheck, t: "Pharmacist verifies", d: "A registered pharmacist reviews it and confirms your medicines." },
                { icon: PackageCheck, t: "Delivered to you", d: "We pack, dispatch and deliver to your doorstep." },
              ].map((s, i) => (
                <li key={s.t} className="flex gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-500/20 text-teal-200">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">
                      {i + 1}. {s.t}
                    </p>
                    <p className="text-sm text-slate-300">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Deals */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Deals of the day</h2>
            <p className="text-sm text-slate-500">Biggest savings on everyday essentials</p>
          </div>
          <Link href="/medicines?sort=discount" className="flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
            See all deals <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {deals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Health concerns */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <h2 className="text-2xl font-bold">Shop by health concern</h2>
        <ul className="mt-5 flex flex-wrap gap-3">
          {healthConcerns.map((h) => (
            <li key={h}>
              <Link
                href={`/medicines?q=${encodeURIComponent(h.split(" ")[0])}`}
                className="inline-block rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700"
              >
                {h}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Best sellers */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Best sellers</h2>
            <p className="text-sm text-slate-500">What most customers are ordering</p>
          </div>
          <Link href="/medicines?sort=rating" className="flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Why MedNeed */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="rounded-3xl bg-teal-50 p-8 md:p-12">
          <h2 className="text-center text-2xl font-bold">Why order from MedNeed</h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BadgeCheck, t: "Genuine medicines", d: "Sourced from licensed distributors and manufacturers." },
              { icon: UserCheck, t: "Pharmacist-checked", d: "Every prescription order is verified by a registered pharmacist." },
              { icon: Clock, t: "Fast delivery", d: "Choose a delivery slot that suits you." },
              { icon: Lock, t: "Safe & private", d: "Your health data and payments are protected." },
            ].map((f) => (
              <li key={f.t} className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-teal-600 shadow-sm">
                  <f.icon className="h-7 w-7" />
                </span>
                <p className="mt-4 font-semibold">{f.t}</p>
                <p className="mt-1 text-sm text-slate-600">{f.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pt-14 sm:px-6">
        <h2 className="text-center text-2xl font-bold">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
