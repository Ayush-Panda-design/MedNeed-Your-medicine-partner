import type { Metadata } from "next";
import { requireStaff } from "@/server/auth/session";
import { listPartners } from "@/server/orders/fulfilment";
import { TeamManager } from "./TeamManager";

export const metadata: Metadata = { title: "Delivery team" };
export const dynamic = "force-dynamic";

export default async function DeliveryTeam() {
  await requireStaff("/admin/delivery-team", ["admin"]);
  const partners = await listPartners();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Delivery team</h1>
        <p className="mt-1 text-sm text-slate-500">Delivery people sign in with their mobile number (an OTP is sent) at <span className="font-mono">/login</span> and see only their own deliveries on <span className="font-mono">/delivery</span>. They cannot open the admin panel.</p>
      </div>
      <TeamManager partners={partners} />
    </div>
  );
}
