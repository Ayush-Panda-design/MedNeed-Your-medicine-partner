import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { discountPercent, formatINR, type Product } from "@/lib/catalog";
import { AddToCartButton } from "./AddToCartButton";
import { ProductVisual } from "./ProductVisual";

export function ProductCard({ product }: { product: Product }) {
  const off = product.orderable ? discountPercent(product) : 0;
  return (
    <article data-spot className="mn-spot group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-900/10">
      <Link href={`/medicines/${product.slug}`} className="relative block overflow-hidden">
        <ProductVisual product={product} className="aspect-[4/3] w-full transition-transform duration-500 ease-out group-hover:scale-[1.05]" />
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
        {product.composition && !product.orderable && <p className="line-clamp-2 text-xs text-slate-500">{product.composition}</p>}
        <div className="mt-2 flex items-baseline gap-2">
          {product.orderable ? (
            <>
              <span className="text-lg font-bold text-slate-900">{formatINR(product.price)}</span>
              {off > 0 && <span className="text-xs text-slate-400 line-through">{formatINR(product.mrp)}</span>}
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-600">{product.restricted ? "Not sold online" : "Price on request"}</span>
          )}
        </div>
        <div className="mt-auto pt-3">
          {product.orderable ? (
            <AddToCartButton slug={product.slug} product={product} disabled={!product.inStock} compact />
          ) : (
            <Link href={`/medicines/${product.slug}`} className="block rounded-xl border border-teal-600 px-4 py-2 text-center text-sm font-semibold text-teal-700 hover:bg-teal-50">
              {product.restricted ? "View details" : "Request this medicine"}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
