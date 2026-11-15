import Link from "next/link";
import { discountPercent, formatINR, type Product } from "@/lib/catalog";
import { heroSerif } from "@/lib/fonts";
import { AddToCartButton } from "./AddToCartButton";
import { ProductVisual } from "./ProductVisual";

/** Product card (design from the Lovable concept): soft floating card, packshot art, serif price, pill buttons. */
export function ProductCard({ product }: { product: Product }) {
  const off = product.orderable ? discountPercent(product) : 0;
  return (
    <article className={`mn-pcard group flex h-full flex-col rounded-[1.5rem] bg-white p-2.5 sm:p-3 ${heroSerif.variable}`}>
      <Link href={`/medicines/${product.slug}`} className="relative block overflow-hidden rounded-[1.15rem]" tabIndex={-1} aria-hidden>
        <ProductVisual product={product} className="aspect-[4/3] w-full" />
        {off > 0 && <span className="absolute left-2 top-2 rounded-full bg-lime-300 px-2 py-0.5 text-[11px] font-bold text-lime-950 sm:text-xs">{off}% OFF</span>}
        {product.rx && (
          <span className="absolute right-2 top-2 rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white sm:text-xs" title="Prescription required">
            Rx
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-1.5 pt-3 sm:px-2">
        <Link href={`/medicines/${product.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 transition-colors group-hover:text-teal-700 sm:text-[15px]">
          {product.name}
        </Link>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 sm:text-[13px]">{product.packSize}</p>
        <p className="line-clamp-1 text-xs text-slate-400">{product.manufacturer}</p>
        {product.composition && !product.orderable && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.composition}</p>}
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          {product.orderable ? (
            <>
              <span className="mn-price text-xl font-semibold text-slate-900 sm:text-2xl">{formatINR(product.price)}</span>
              {off > 0 && <s className="text-xs text-slate-400 sm:text-sm">{formatINR(product.mrp)}</s>}
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-600">{product.restricted ? "Not sold online" : "Price on request"}</span>
          )}
        </div>
        <div className="pt-3">
          {product.orderable ? (
            <AddToCartButton slug={product.slug} product={product} disabled={!product.inStock} compact />
          ) : (
            <Link href={`/medicines/${product.slug}`} className="flex h-10 items-center justify-center rounded-full border border-teal-600 px-4 text-sm font-semibold text-teal-700 hover:bg-teal-50">
              {product.restricted ? "View details" : "Request this medicine"}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
