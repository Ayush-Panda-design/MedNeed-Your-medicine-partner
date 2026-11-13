import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SupportChat } from "@/components/SupportChat";
import { listCategories } from "@/server/catalog/queries";
import { aiEnabled } from "@/server/env";

// Prices, stock and publication status change at any time, so storefront pages are rendered per request.
export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const categories = await listCategories();
  return (
    <>
      <Header categories={categories} />
      {children}
      <Footer categories={categories} />
      {aiEnabled() && <SupportChat />}
    </>
  );
}
