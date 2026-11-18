import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CONCERNS } from "@/lib/homeMedia";
import { heroSerif } from "@/lib/fonts";
import { searchProducts } from "@/server/catalog/queries";
import { cached } from "@/server/cache";
import "./home.css";

/** Popular generic picks shown on hover (search terms, not product claims). */
const PICKS: Record<string, string[]> = {
  "Fever & pain": ["Paracetamol 650", "Thermometer", "Ibuprofen"],
  "Cold & flu": ["Cough syrup", "Nasal spray", "Lozenges"],
  "Diabetes care": ["Glucometer", "Test strips", "Metformin"],
  "Heart & BP": ["BP monitor", "Amlodipine", "Atorvastatin"],
  "Acidity & digestion": ["Antacid", "Pantoprazole", "ORS"],
  Immunity: ["Vitamin C", "Vitamin D3", "Zinc"],
  "Skin & allergy": ["Cetirizine", "Sunscreen", "Moisturiser"],
  "Baby care": ["Baby lotion", "Diaper cream", "Baby wipes"],
};

function roughCount(n: number) {
  if (n >= 1000) return `${Math.floor(n / 100) * 100}+`;
  if (n >= 20) return `${Math.floor(n / 10) * 10}+`;
  return String(n);
}

/**
 * "Shop by health concern" as an editorial bento (design from the Lovable concept): full-bleed photos, serif
 * titles, a live product count, and popular picks revealed on hover. Phones: a swipeable row of tall cards.
 */
export async function ConcernCards() {
  const counts = await Promise.all(
    // Each count runs a full search, so they are kept for five minutes rather than recomputed on every homepage view.
    CONCERNS.map((c) => cached(`concern:${c.q}`, 300_000, () => searchProducts({ q: c.q, page: 1, pageSize: 1 }).then((r) => r.total)).catch(() => 0)),
  );
  return (
    <section aria-labelledby="hc-title" className={`mx-auto max-w-7xl px-4 pt-14 sm:px-6 ${heroSerif.variable}`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Find it faster</p>
          <h2 id="hc-title" data-words className="mn-display text-4xl leading-[1.05] text-slate-900 sm:text-5xl lg:text-6xl">
            <span className="mn-w">Shop</span> <span className="mn-w">by</span> <span className="mn-w">health</span> <em className="mn-w mn-accent">concern</em>
          </h2>
        </div>
        <p className="max-w-sm text-sm text-slate-600 sm:text-base">Start from how you feel. Each collection is reviewed by our pharmacists.</p>
      </div>
      <ul data-stagger className="hb-grid" role="list">
        {CONCERNS.map((c, i) => {
          const n = counts[i];
          return (
            <li key={c.name} className={`hb-item ${i === 0 ? "hb-big" : i === 3 ? "hb-wide" : ""}`}>
              <Link href={`/medicines?q=${encodeURIComponent(c.q)}`} className="hb-card group">
                {c.photo ? (
                  <Image src={c.photo} alt="" fill sizes={i === 0 ? "(min-width: 1024px) 620px, 80vw" : "(min-width: 1024px) 310px, 80vw"} className="hb-photo" />
                ) : (
                  <span className="absolute inset-0 bg-gradient-to-br from-teal-700 to-lime-500" />
                )}
                <span aria-hidden className="hb-scrim" />
                {n > 0 && <span className="hb-count">{roughCount(n)} {n === 1 ? "product" : "products"}</span>}
                <span aria-hidden className="hb-arrow"><ArrowUpRight className="h-5 w-5" /></span>
                <span className="hb-body">
                  <span className={`hb-title mn-display ${i === 0 ? "hb-title-lg" : ""}`}>{c.name}</span>
                  <span className="hb-blurb">{c.blurb}</span>
                  <span className="hb-picks-wrap">
                    <span className="hb-picks" aria-label="Popular picks">
                      {(PICKS[c.name] ?? []).map((p) => (
                        <span key={p} className="hb-pick">{p}</span>
                      ))}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
