import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { query, type Row } from "../db";
import { getSettings, type StoreSettings } from "./settings";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type InvoiceLine = {
  name: string; packSize: string; hsn: string; batches: string; qty: number; mrp: number; rate: number; gstPercent: number;
  gross: number; taxable: number; tax: number; cgst: number; sgst: number; igst: number;
};
export type InvoiceData = {
  number: string; date: string; orderNumber: string; seller: StoreSettings["shop"] & StoreSettings["invoice"];
  buyer: { name: string; phone: string; address: string; state: string };
  interState: boolean; lines: InvoiceLine[]; delivery: InvoiceLine | null;
  discount: number; total: number; payment: string; prescription: string | null;
  taxSummary: { rate: number; taxable: number; cgst: number; sgst: number; igst: number }[];
};

/** Splits a GST-inclusive amount into taxable value and tax, and the tax into CGST+SGST or IGST. */
function split(gross: number, rate: number, interState: boolean) {
  const taxable = r2(gross / (1 + rate / 100));
  const tax = r2(gross - taxable);
  if (interState) return { taxable, tax, cgst: 0, sgst: 0, igst: tax };
  const cgst = r2(tax / 2);
  return { taxable, tax, cgst, sgst: r2(tax - cgst), igst: 0 };
}

export async function buildInvoice(orderId: string, scope: { userId?: string }): Promise<InvoiceData | null> {
  const params: unknown[] = [orderId];
  let where = "id = $1";
  if (scope.userId) { params.push(scope.userId); where += " and user_id = $2"; }
  const o = (await query<Row>(`select * from orders where ${where}`, params))[0];
  if (!o || !o.invoice_number) return null;
  const settings = await getSettings();
  const items = await query<Row>(
    `select i.*, (select string_agg(b.batch_no || ' (' || to_char(b.expiry_date, 'MM/YY') || ')' || case when b.qty <> i.qty then ' x' || b.qty else '' end, ', ' order by b.expiry_date) from order_item_batches b where b.order_item_id = i.id) as batches
       from order_items i where i.order_id = $1 order by i.name`, [orderId]);
  const addr = o.address as null | { line1: string; line2: string | null; city: string; state: string; pincode: string; landmark: string | null };
  const buyerState = addr?.state ?? settings.invoice.state;
  const interState = buyerState.trim().toLowerCase() !== settings.invoice.state.trim().toLowerCase();

  // The coupon discount is shared across the items in proportion to what each costs, so tax is charged on what was actually paid.
  const subtotal = items.reduce((s, i) => s + Number(i.line_total), 0);
  const discount = Number(o.discount);
  let left = discount;
  const lines: InvoiceLine[] = items.map((i, idx) => {
    const share = idx === items.length - 1 ? left : r2((discount * Number(i.line_total)) / (subtotal || 1));
    left = r2(left - share);
    const gross = r2(Number(i.line_total) - share);
    const rate = Number(i.gst_percent);
    return { name: i.name, packSize: i.pack_size, hsn: i.hsn, batches: i.batches ?? "", qty: Number(i.qty), mrp: Number(i.mrp), rate: Number(i.unit_price), gstPercent: rate, gross, ...split(gross, rate, interState) };
  });
  const fee = Number(o.delivery_fee);
  const dRate = settings.invoice.deliveryGstPercent;
  const delivery: InvoiceLine | null = fee > 0
    ? { name: "Delivery charge", packSize: "", hsn: "9968", batches: "", qty: 1, mrp: fee, rate: fee, gstPercent: dRate, gross: fee, ...split(fee, dRate, interState) }
    : null;

  const all = delivery ? [...lines, delivery] : lines;
  const byRate = new Map<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number }>();
  for (const l of all) {
    const e = byRate.get(l.gstPercent) ?? { rate: l.gstPercent, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    e.taxable = r2(e.taxable + l.taxable); e.cgst = r2(e.cgst + l.cgst); e.sgst = r2(e.sgst + l.sgst); e.igst = r2(e.igst + l.igst);
    byRate.set(l.gstPercent, e);
  }
  const payLabel = o.payment_method === "online" ? "Paid online (Razorpay)" : o.payment_method === "cod" ? "Cash / UPI on delivery" : "Paid at the store";
  return {
    number: o.invoice_number, date: new Date(o.invoice_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }),
    orderNumber: o.order_number, seller: { ...settings.shop, ...settings.invoice },
    buyer: { name: o.customer_name, phone: o.customer_phone, state: buyerState, address: addr ? [addr.line1, addr.line2, addr.landmark ? `near ${addr.landmark}` : null, `${addr.city}, ${addr.state} ${addr.pincode}`].filter(Boolean).join(", ") : "Store pickup" },
    interState, lines, delivery, discount, total: Number(o.total), payment: `${payLabel}${o.payment_status === "refunded" ? " (refunded)" : ""}`,
    prescription: o.requires_prescription ? `Prescription ${o.prescription_status}${o.prescription_note ? `: ${o.prescription_note}` : ""}` : null,
    taxSummary: [...byRate.values()].sort((a, b) => a.rate - b.rate),
  };
}

/* ---------- PDF ---------- */

// Standard PDF fonts cannot print the rupee sign or most non-Latin letters, so text is cleaned and amounts say "Rs".
const clean = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7E -ÿ]/g, "?");
const money = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function wrap(text: string, font: PDFFont, size: number, width: number, maxLines: number) {
  const words = clean(text).split(" ");
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= width) cur = next;
    else { if (cur) out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  if (out.length > maxLines) { out.length = maxLines; out[maxLines - 1] = out[maxLines - 1].slice(0, -2) + ".."; }
  return out;
}

export async function renderInvoicePdf(d: InvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${d.number}`);
  pdf.setProducer("MedNeed");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 36;
  const ink = rgb(0.1, 0.12, 0.16), grey = rgb(0.4, 0.44, 0.5), line = rgb(0.8, 0.83, 0.87);
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  const text = (t: string, x: number, size = 9, f = font, color = ink) => page.drawText(clean(t), { x, y, size, font: f, color });
  const right = (t: string, xr: number, size = 9, f = font) => page.drawText(clean(t), { x: xr - f.widthOfTextAtSize(clean(t), size), y, size, font: f, color: ink });
  const rule = (yy = y) => page.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: 0.6, color: line });

  const hasGst = d.seller.gstin.length > 0;
  text(d.seller.legalName, M, 16, bold); right(hasGst ? "TAX INVOICE" : "INVOICE", W - M, 14, bold); y -= 14;
  for (const l of wrap(d.seller.address, font, 8.5, 300, 3)) { text(l, M, 8.5, font, grey); y -= 11; }
  text(`Phone ${d.seller.phone || "-"}`, M, 8.5, font, grey); y -= 11;
  text(`GSTIN: ${d.seller.gstin || "not registered yet"}    Drug licence: ${d.seller.drugLicense || "-"}`, M, 8.5, font, grey); y -= 8;
  const metaTop = H - M - 14;
  page.drawText(`Invoice no: ${d.number}`, { x: 360, y: metaTop - 14, size: 9, font: bold, color: ink });
  page.drawText(`Date: ${d.date}`, { x: 360, y: metaTop - 26, size: 9, font, color: ink });
  page.drawText(`Order: ${d.orderNumber}`, { x: 360, y: metaTop - 38, size: 9, font, color: ink });
  y -= 6; rule(); y -= 14;

  text("Billed to", M, 8, bold, grey); text("Supply", 360, 8, bold, grey); y -= 12;
  const top = y;
  text(d.buyer.name, M, 9.5, bold); y -= 12;
  text(`Phone ${d.buyer.phone}`, M, 9, font); y -= 11;
  for (const l of wrap(d.buyer.address, font, 9, 290, 3)) { text(l, M, 9); y -= 11; }
  const after = y;
  y = top;
  text(`Place of supply: ${d.buyer.state}`, 360, 9); y -= 12;
  text(d.interState ? "IGST applies (supply to another state)" : "CGST + SGST apply", 360, 8.5, font, grey); y -= 11;
  text(`Payment: ${d.payment}`, 360, 8.5, font, grey);
  y = Math.min(after, y) - 8; rule(); y -= 14;

  // table
  const cols = [
    { k: "#", w: 16, a: "l" }, { k: "Item", w: 142, a: "l" }, { k: "Batch / expiry", w: 78, a: "l" }, { k: "HSN", w: 30, a: "l" },
    { k: "Qty", w: 22, a: "r" }, { k: "MRP", w: 38, a: "r" }, { k: "Rate", w: 38, a: "r" }, { k: "GST%", w: 26, a: "r" },
    { k: "Taxable", w: 44, a: "r" }, { k: "GST", w: 38, a: "r" }, { k: "Amount", w: 46, a: "r" },
  ] as const;
  const xs: number[] = []; { let x = M; for (const c of cols) { xs.push(x); x += c.w; } }
  const header = () => {
    cols.forEach((c, i) => (c.a === "l" ? text(c.k, xs[i] + 1, 7.5, bold, grey) : right(c.k, xs[i] + c.w - 1, 7.5, bold)));
    y -= 5; rule(); y -= 11;
  };
  header();
  const row = (l: InvoiceLine, n: number | null) => {
    const nameLines = wrap(l.packSize ? `${l.name} (${l.packSize})` : l.name, font, 8, cols[1].w - 4, 3);
    const batchLines = wrap(l.batches, font, 7, cols[2].w - 3, 3);
    const h = Math.max(nameLines.length, batchLines.length, 1) * 9.5 + 4;
    if (y - h < M + 150) { page = pdf.addPage([W, H]); y = H - M; header(); }
    const y0 = y;
    if (n) text(String(n), xs[0] + 1, 8);
    nameLines.forEach((t, i) => { y = y0 - i * 9.5; text(t, xs[1] + 1, 8); });
    batchLines.forEach((t, i) => { y = y0 - i * 9.5; text(t, xs[2] + 1, 7); });
    y = y0;
    text(l.hsn, xs[3] + 1, 7.5);
    const cell = (i: number, t: string) => right(t, xs[i] + cols[i].w - 1, 8);
    cell(4, String(l.qty)); cell(5, l.packSize ? money(l.mrp) : ""); cell(6, money(l.rate)); cell(7, String(l.gstPercent)); cell(8, money(l.taxable)); cell(9, money(l.tax)); cell(10, money(l.gross));
    y = y0 - h; rule(y + 3); y -= 8;
  };
  d.lines.forEach((l, i) => row(l, i + 1));
  if (d.delivery) row(d.delivery, null);

  if (y < M + 190) { page = pdf.addPage([W, H]); y = H - M; }
  y -= 4;
  if (d.discount > 0) { text("Coupon discount (already deducted above)", M, 8.5, font, grey); right(`- Rs ${money(d.discount)}`, W - M, 9); y -= 14; }
  text("Total payable", M, 11, bold); right(`Rs ${money(d.total)}`, W - M, 12, bold); y -= 20;

  // GST summary
  text("GST summary", M, 8, bold, grey); y -= 11;
  const sx = [M, M + 50, M + 130, M + 200, M + 270];
  ["Rate", "Taxable value", d.interState ? "IGST" : "CGST", d.interState ? "" : "SGST"].forEach((t, i) => text(t, sx[i], 7.5, bold, grey)); y -= 4; rule(); y -= 10;
  for (const s of d.taxSummary) {
    text(`${s.rate}%`, sx[0], 8); text(money(s.taxable), sx[1], 8);
    text(money(d.interState ? s.igst : s.cgst), sx[2], 8); if (!d.interState) text(money(s.sgst), sx[3], 8);
    y -= 11;
  }
  y -= 6;
  if (d.prescription) { text(d.prescription, M, 8, font, grey); y -= 11; }
  text("Prices include GST.", M, 8, font, grey); y -= 11;
  for (const l of wrap(d.seller.footerNote, font, 8, W - 2 * M, 3)) { text(l, M, 8, font, grey); y -= 10; }
  y -= 8; text("This is a computer-generated invoice.", M, 7.5, font, grey);
  return pdf.save();
}
