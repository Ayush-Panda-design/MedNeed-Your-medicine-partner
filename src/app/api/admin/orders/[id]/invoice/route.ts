import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handle } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { buildInvoice, renderInvoicePdf } from "@/server/orders/invoice";

type Ctx = { params: Promise<{ id: string }> };

// The invoice exists once the order has been delivered or collected.
export const GET = handle<Ctx>(async (_req, { params }) => {
  await requireApiStaff(["admin", "pharmacist"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Invoice not found.");
  const data = await buildInvoice(id, {});
  if (!data) throw new ApiError(404, "The invoice is available once the order is delivered.");
  const pdf = await renderInvoicePdf(data);
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="invoice-${data.number.replace(/[^A-Za-z0-9-]/g, "-")}.pdf"`, "Cache-Control": "private, no-store" },
  });
});
