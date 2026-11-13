import type { MetadataRoute } from "next";
import { appUrl } from "@/server/env";
import { listAllActiveSlugs, listCategories } from "@/server/catalog/queries";

// Built per request from the database. One sitemap holds up to 50,000 URLs; switch to generateSitemaps() beyond that.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const [categories, products] = await Promise.all([listCategories(), listAllActiveSlugs()]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/medicines`, changeFrequency: "daily", priority: 0.9 },
    ...["about", "contact", "privacy", "terms", "refunds", "shipping"].map((p) => ({ url: `${base}/${p}`, changeFrequency: "monthly" as const, priority: 0.3 })),
    ...categories.map((c) => ({ url: `${base}/medicines?category=${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.slice(0, 49000).map((p) => ({ url: `${base}/medicines/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
