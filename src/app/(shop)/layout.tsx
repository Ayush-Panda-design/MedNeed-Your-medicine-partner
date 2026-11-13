import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SupportChat } from "@/components/SupportChat";
import { listCategories } from "@/server/catalog/queries";
import { aiEnabled } from "@/server/env";
import { businessInfo } from "@/server/orders/settings";

// Prices, stock and publication status change at any time, so storefront pages are rendered per request.
export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [categories, business] = await Promise.all([listCategories(), businessInfo()]);
  return (
    <>
      <Header categories={categories} />
      {children}
      <Footer categories={categories} business={business} />
      {aiEnabled() && <SupportChat />}
    </>
  );
}
