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
import { StoreHero } from "@/components/hero/StoreHero";
import { HowItWorks } from "@/components/HowItWorks";
import { SectionHead } from "@/components/SectionHead";
import { FaqChat } from "@/components/home/FaqChat";
import { RxStory } from "@/components/motion/RxStory";
import { PromiseBand } from "@/components/PromiseBand";
import { PromiseStories } from "@/components/promise/PromiseStories";
import { ConcernCards } from "@/components/home/ConcernCards";
import { OfferBanners } from "@/components/home/OfferBanners";
import { VisitStore } from "@/components/home/VisitStore";
import { businessInfo } from "@/server/orders/settings";
import { CountUp } from "@/components/motion/CountUp";
import { ProductCard } from "@/components/ProductCard";
import { CategoryTiles } from "@/components/category/CategoryTiles";
import { faqs } from "@/lib/faq";
import { categoryCounts, listCategories, listDeals, listNewest } from "@/server/catalog/queries";

export default async function Home() {
  const [categories, deals, newest, counts, business] = await Promise.all([listCategories(), listDeals(4), listNewest(8), categoryCounts(), businessInfo()]);
  return (
    <main>
      <StoreHero />

      {/* Trust stats */}
      <section id="after-hero" className="scroll-mt-24 border-b border-slate-100 bg-white">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 text-center sm:px-6 md:grid-cols-4">
          <li data-reveal><p className="text-3xl font-extrabold text-teal-700"><CountUp value={2} /></p><p className="mt-1 text-xs font-medium text-slate-500">Branches in Bhubaneswar</p></li>
          <li data-reveal data-reveal-delay="90"><p className="text-3xl font-extrabold text-teal-700"><CountUp value={15} suffix=" km" /></p><p className="mt-1 text-xs font-medium text-slate-500">Home-delivery radius</p></li>
          <li data-reveal data-reveal-delay="180"><p className="text-3xl font-extrabold text-teal-700"><CountUp value={100} suffix="%" /></p><p className="mt-1 text-xs font-medium text-slate-500">Pharmacist-verified orders</p></li>
          <li data-reveal data-reveal-delay="270"><p className="text-3xl font-extrabold text-teal-700">7<span className="text-xl">AM</span>–10<span className="text-xl">PM</span></p><p className="mt-1 text-xs font-medium text-slate-500">Open every day</p></li>
        </ul>
      </section>

      <PromiseBand />

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <CategoryTiles categories={categories} counts={counts} />
      </section>

      {/* Upload prescription */}
      <section id="upload" className="mx-auto mt-14 max-w-7xl scroll-mt-40 px-4 sm:px-6">
        <div data-reveal="zoom" className="relative overflow-hidden rounded-3xl border border-line bg-surface text-ink shadow-card">
          <span aria-hidden data-parallax="0.12" className="mn-orb -right-16 -top-20 h-72 w-72" />
          <span aria-hidden data-parallax="-0.08" className="mn-orb mn-orb-warm -bottom-24 left-1/3 h-64 w-64" />
          <div className="relative grid gap-8 p-8 md:grid-cols-2 md:p-12">
            <div data-reveal="left">
              <span className="inline-flex items-center gap-2 rounded-full bg-chip px-3 py-1 text-xs font-semibold text-chip-fg">
                <FileText className="h-4 w-4" /> Have a prescription?
              </span>
              <h2 className="mt-4 text-3xl font-bold text-ink">Order in three simple steps</h2>
              <p className="mt-3 max-w-md text-ink-2">
                Upload a photo of your doctor&apos;s prescription. A registered pharmacist verifies it and your order is on its way.
              </p>
              <Link href="/account/prescriptions/new" data-fx="jelly" data-magnetic className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-teal-700">
                <Upload className="h-4 w-4" /> Upload prescription
              </Link>
              <p className="mt-3 text-xs text-ink-muted">Approved prescriptions can be reused for repeat orders until they expire.</p>
              <RxStory />
            </div>
            <div data-reveal="right"><HowItWorks /></div>
          </div>
        </div>
      </section>

      {/* The MedNeed promise: four interactive stories */}
      <PromiseStories />

      {/* Offer banners */}
      <OfferBanners />

      {/* Deals */}
      {deals.length > 0 && (
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <SectionHead display eyebrow="Offers" title="Deals of the day" sub="Biggest savings on everyday essentials"
          action={<Link href="/medicines?sort=discount" className="flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">See all deals <ChevronRight className="h-4 w-4" /></Link>} />
        <div data-stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {deals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      )}

      {/* Health concerns: picture cards */}
      <ConcernCards />

      {/* New arrivals */}
      {newest.length > 0 && (
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <SectionHead display eyebrow="New" title="New arrivals" sub="Recently added to our catalogue"
          action={<Link href="/medicines" className="flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">View all <ChevronRight className="h-4 w-4" /></Link>} />
        <div data-stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {newest.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      )}

      {/* Why MedNeed */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div data-reveal="zoom" className="relative overflow-hidden rounded-3xl bg-teal-50 p-8 md:p-12">
          <span aria-hidden data-parallax="0.1" className="mn-orb -left-20 -top-16 h-64 w-64" />
          <span aria-hidden data-parallax="-0.1" className="mn-orb mn-orb-warm -bottom-20 -right-16 h-64 w-64" />
          <SectionHead eyebrow="Why MedNeed" title="Why order from MedNeed" center />
          <ul data-stagger className="relative mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BadgeCheck, t: "Genuine medicines", d: "Sourced from licensed distributors and manufacturers." },
              { icon: UserCheck, t: "Pharmacist-checked", d: "Every prescription order is verified by a registered pharmacist." },
              { icon: Clock, t: "Fast delivery", d: "Choose a delivery slot that suits you." },
              { icon: Lock, t: "Safe & private", d: "Your health data and payments are protected." },
            ].map((f) => (
              <li key={f.t} className="group rounded-2xl p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-teal-900/5">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-teal-600 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-teal-900/20">
                  <f.icon className="h-7 w-7" />
                </span>
                <p className="mt-4 font-semibold">{f.t}</p>
                <p className="mt-1 text-sm text-slate-600">{f.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Visit our store */}
      <VisitStore phone={business.phone} hoursLabel={business.hoursLabel} />

      {/* FAQ: a conversation with our pharmacist */}
      <FaqChat faqs={faqs} />
    </main>
  );
}
