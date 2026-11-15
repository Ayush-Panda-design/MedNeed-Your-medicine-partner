import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { CONCERNS } from "@/lib/homeMedia";
import { CATEGORY_TILES, FALLBACK_TILE } from "@/lib/categoryTiles";
import { CategoryArt } from "../category/CategoryArt";
import { SectionHead } from "../SectionHead";
import "../category/tiles.css";
import "./home.css";

/** "Shop by health concern": picture cards (licensed photo when configured, otherwise MedNeed's illustration). */
export function ConcernCards() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
      <SectionHead eyebrow="By concern" title="Shop by health concern" sub="Find what you need for common health needs" />
      <ul data-stagger className="hc-grid" role="list">
        {CONCERNS.map((c) => {
          const t = CATEGORY_TILES[c.art] ?? FALLBACK_TILE;
          const style = { "--c1": t.c1, "--c2": t.c2, "--a": t.a, "--p": t.p } as CSSProperties;
          return (
            <li key={c.name}>
              <Link href={`/medicines?q=${encodeURIComponent(c.q)}`} className="hc-card" data-spot style={style}>
                <span className="hc-media">
                  {c.photo ? (
                    <Image src={c.photo} alt="" fill sizes="(min-width: 1024px) 300px, 50vw" className="hc-photo" />
                  ) : (
                    <>
                      <span className="hc-glow" aria-hidden />
                      <CategoryArt slug={c.art} className="ct-art hc-art" />
                    </>
                  )}
                </span>
                <span className="hc-body">
                  <span className="hc-name">{c.name}</span>
                  <span className="hc-blurb">{c.blurb}</span>
                  <span className="hc-cta">Shop now <ArrowRight className="h-3.5 w-3.5" aria-hidden /></span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
