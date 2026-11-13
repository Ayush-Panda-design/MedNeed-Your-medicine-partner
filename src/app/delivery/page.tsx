import { requireDelivery } from "@/server/auth/session";
import { partnerWork } from "@/server/orders/fulfilment";
import { DeliveryApp } from "./DeliveryApp";

export const dynamic = "force-dynamic";

export default async function DeliveryHome() {
  const user = await requireDelivery("/delivery");
  const work = await partnerWork(user.id);
  return <DeliveryApp name={user.name ?? "there"} initial={work} />;
}
