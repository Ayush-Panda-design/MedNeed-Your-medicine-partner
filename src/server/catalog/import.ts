import { db, query } from "../db";
import { audit } from "../auth/users";
import { CSV_OPTIONAL_COLUMNS, CSV_REQUIRED_COLUMNS, FORMS, SCHEDULES } from "@/lib/catalog";
import { parseCsv } from "./csv";
import { insertMedicine, updateInTx, type Actor } from "./repo";
import { medicineFields, type MedicineFields } from "./schema";
import { parseComposition } from "./text";

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 3 * 1024 * 1024;

const REQUIRED_COLUMNS = CSV_REQUIRED_COLUMNS;
const OPTIONAL_COLUMNS = CSV_OPTIONAL_COLUMNS;

export type ImportReport = {
  ok: boolean;
  imported: boolean;
  total: number;
  create: number;
  update: number;
  errors: { row: number; message: string }[];
  warnings: string[];
  preview: { row: number; name: string; manufacturer: string; schedule: string; mrp: number; price: number; action: "create" | "update" }[];
};

const clean = (s: string | undefined) => (s ?? "").trim();
const bool = (s: string, fallback: boolean) => {
  const v = s.trim().toLowerCase();
  if (!v) return fallback;
  if (["1", "true", "yes", "y"].includes(v)) return true;
  if (["0", "false", "no", "n"].includes(v)) return false;
  throw new Error(`"${s}" is not yes or no`);
};
const money = (s: string, label: string) => {
  const n = Number(s.replace(/[₹,\s]/g, "").replace(/^rs\.?/i, ""));
  if (!Number.isFinite(n)) throw new Error(`${label} "${s}" is not a number`);
  return n;
};
const list = (s: string) => s.split("|").map((x) => x.trim()).filter(Boolean);

type ParsedRow = { line: number; fields: MedicineFields; present: Set<keyof MedicineFields>; sourceRef: string | null };

/**
 * Validates a CSV of medicines and, when commit is true and every row is valid, writes them all in one transaction.
 * Imported rows always arrive as unverified drafts. A row that matches an existing medicine updates it, and if the update
 * changes what the product is (name, form, pack, schedule, salts) it goes back to review.
 */
export async function runImport(actor: Actor, text: string, commit: boolean): Promise<ImportReport> {
  const report: ImportReport = { ok: false, imported: false, total: 0, create: 0, update: 0, errors: [], warnings: [], preview: [] };

  let table: string[][];
  try {
    table = parseCsv(text);
  } catch (err) {
    report.errors.push({ row: 0, message: err instanceof Error ? err.message : "Could not read the file." });
    return report;
  }
  if (table.length < 2) {
    report.errors.push({ row: 0, message: "The file needs a header row and at least one medicine." });
    return report;
  }
  const header = table[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) {
    report.errors.push({ row: 1, message: `Missing required column(s): ${missing.join(", ")}` });
    return report;
  }
  const known = new Set<string>([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);
  const unknown = header.filter((h) => h && !known.has(h));
  if (unknown.length) report.warnings.push(`Ignored unknown column(s): ${unknown.join(", ")}`);
  if (header.includes("image_url") || header.includes("image")) report.warnings.push("Images are not imported. Upload product images in the admin panel.");

  const dataRows = table.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    report.errors.push({ row: 0, message: `Too many rows (${dataRows.length}). Import at most ${MAX_IMPORT_ROWS} at a time.` });
    return report;
  }
  report.total = dataRows.length;

  const categories = await query<{ id: string; slug: string; name: string }>(`select id, slug, name from categories`);
  const catBy = new Map<string, string>();
  for (const c of categories) {
    catBy.set(c.slug.toLowerCase(), c.id);
    catBy.set(c.name.toLowerCase(), c.id);
  }
  const formBy = new Map(FORMS.map((f) => [f.toLowerCase(), f]));
  const schedBy = new Map(SCHEDULES.map((s) => [s.toLowerCase(), s]));

  const parsed: ParsedRow[] = [];
  const seen = new Map<string, number>();
  const col = (r: string[], name: string) => clean(r[header.indexOf(name)]);

  dataRows.forEach((r, i) => {
    const line = i + 2;
    try {
      const present = new Set<keyof MedicineFields>();
      const form = formBy.get(col(r, "form").toLowerCase());
      if (!form) throw new Error(`form "${col(r, "form")}" is not recognised (use: ${FORMS.join(", ")})`);
      const schedule = schedBy.get(col(r, "schedule").toLowerCase());
      if (!schedule) throw new Error(`schedule is required and must be one of ${SCHEDULES.join(", ")}`);
      const categoryId = catBy.get(col(r, "category").toLowerCase());
      if (!categoryId) throw new Error(`category "${col(r, "category")}" does not exist. Create it first or use an existing slug or name`);

      const optional = (name: (typeof OPTIONAL_COLUMNS)[number]) => col(r, name);
      const input: Record<string, unknown> = {
        name: col(r, "name"),
        manufacturer: col(r, "manufacturer"),
        categoryId,
        form,
        packSize: col(r, "pack_size"),
        mrp: money(col(r, "mrp"), "MRP"),
        price: money(col(r, "price"), "price"),
        schedule,
        noOnlineSale: bool(optional("no_online_sale"), false),
        salts: parseComposition(optional("composition")),
        description: optional("description"),
        uses: list(optional("uses")),
        howToUse: optional("how_to_use"),
        sideEffects: list(optional("side_effects")),
        precautions: list(optional("precautions")),
        imageUrl: null,
        nppaCeilingPrice: optional("nppa_ceiling_price") ? money(optional("nppa_ceiling_price"), "NPPA ceiling price") : null,
      };
      // Blank optional cells never wipe existing content on update.
      for (const k of ["name", "manufacturer", "categoryId", "form", "packSize", "mrp", "price", "schedule"] as const) present.add(k);
      if (optional("no_online_sale")) present.add("noOnlineSale");
      if (optional("composition")) present.add("salts");
      if (optional("description")) present.add("description");
      if (optional("uses")) present.add("uses");
      if (optional("how_to_use")) present.add("howToUse");
      if (optional("side_effects")) present.add("sideEffects");
      if (optional("precautions")) present.add("precautions");
      if (optional("nppa_ceiling_price")) present.add("nppaCeilingPrice");

      const fields = medicineFields.parse(input);
      if (fields.price > fields.mrp) throw new Error("price is higher than MRP");
      const key = `${fields.name.toLowerCase()}|${fields.manufacturer.toLowerCase()}|${fields.packSize.toLowerCase()}`;
      if (seen.has(key)) throw new Error(`duplicates row ${seen.get(key)} (same name, manufacturer and pack size)`);
      seen.set(key, line);
      parsed.push({ line, fields, present, sourceRef: optional("source_ref") || null });
    } catch (err) {
      let message = err instanceof Error ? err.message : "invalid row";
      if (err && typeof err === "object" && "issues" in err) {
        const issue = (err as { issues: { message: string; path: PropertyKey[] }[] }).issues[0];
        const label = String(issue?.path?.[0] ?? "");
        message = label ? `${label}: ${issue.message}` : (issue?.message ?? message);
      }
      report.errors.push({ row: line, message });
    }
  });

  // Which rows already exist?
  const existing = await query<{ id: string; n: string; mf: string; p: string }>(
    `select m.id, lower(m.name) as n, lower(mf.name) as mf, lower(m.pack_size) as p from medicines m join manufacturers mf on mf.id = m.manufacturer_id`,
  );
  const existingBy = new Map(existing.map((e) => [`${e.n}|${e.mf}|${e.p}`, e.id]));
  const plan = parsed.map((p) => ({ ...p, existingId: existingBy.get(`${p.fields.name.toLowerCase()}|${p.fields.manufacturer.toLowerCase()}|${p.fields.packSize.toLowerCase()}`) ?? null }));
  report.create = plan.filter((p) => !p.existingId).length;
  report.update = plan.length - report.create;
  report.preview = plan.slice(0, 10).map((p) => ({
    row: p.line, name: p.fields.name, manufacturer: p.fields.manufacturer, schedule: p.fields.schedule, mrp: p.fields.mrp, price: p.fields.price,
    action: p.existingId ? "update" : "create",
  }));

  report.ok = report.errors.length === 0;
  if (!report.ok || !commit) return report;

  const database = await db();
  const caches = { mf: new Map<string, string>(), salt: new Map<string, string>() };
  let sentBack = 0;
  await database.tx(async (t) => {
    for (const p of plan) {
      if (p.existingId) {
        const patch: Partial<MedicineFields> = {};
        for (const k of p.present) (patch as Record<string, unknown>)[k] = p.fields[k];
        const out = await updateInTx(t, actor, p.existingId, patch, { bulk: true });
        if (out.sentBackForReview) sentBack++;
      } else {
        await insertMedicine(t, actor.id, p.fields, { source: "csv-import", sourceRef: p.sourceRef }, caches);
      }
    }
    await audit(actor.id, "catalog.import", { created: report.create, updated: report.update, sentBackForReview: sentBack }, actor.ip, t.query);
  });
  if (sentBack) report.warnings.push(`${sentBack} existing medicine(s) changed in a way that needs re-verification and were moved back to draft.`);
  report.imported = true;
  return report;
}
