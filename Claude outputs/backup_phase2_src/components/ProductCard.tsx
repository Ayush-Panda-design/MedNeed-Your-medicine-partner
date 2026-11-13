import Link from "next/link";
import { ShieldAlert, Star } from "lucide-react";
import { discountPercent, formatINR, type Product } from "@/lib/data";
import { AddToCartButton } from "./AddToCartButton";
import { ProductVisual } from "./ProductVisual";

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/medicines/${product.slug}`} className="relative block">
        <ProductVisual product={product} className="aspect-[4/3] w-full" />
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-950">{off}% OFF</span>
        )}
        {product.rx && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-rose-600">
            <ShieldAlert className="h-3 w-3" /> Rx
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <Link href={`/medicines/${product.slug}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-900 group-hover:text-teal-700">
          {product.name}
        </Link>
        <p className="line-clamp-1 text-xs text-slate-500">{product.packSize}</p>
        <p className="line-clamp-1 text-xs text-slate-400">{product.manufacturer}</p>
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-600">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{product.rating.toFixed(1)}</span>
          <span className="text-slate-400">({product.reviews.toLocaleString("en-IN")})</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-slate-900">{formatINR(product.price)}</span>
          {off > 0 && <span className="text-xs text-slate-400 line-through">{formatINR(product.mrp)}</span>}
        </div>
        <div className="mt-auto pt-3">
          <AddToCartButton slug={product.slug} disabled={!product.inStock} compact />
        </div>
      </div>
    </article>
  );
}
