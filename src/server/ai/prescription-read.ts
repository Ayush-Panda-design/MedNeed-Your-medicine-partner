import { createHash } from "crypto";
import { query, type Row } from "../db";
import { geminiVisionModel } from "../env";
import { getPrescriptionFile } from "../prescriptions/storage";
import { searchProducts } from "../catalog/queries";
import { generateJSON, type Part } from "./gemini";
import { cached } from "./cache";

/** How many pages to send to the model. Keeps the request within free-tier size limits. */
const MAX_PAGES = 4;

type RawMedicine = { name?: string; strength?: string; form?: string };
type Extracted = {
  patientName?: string;
  doctorName?: string;
  doctorRegNo?: string;
  prescribedOn?: string | null;
  medicines?: RawMedicine[];
  notes?: string;
  legible?: boolean;
};

export type MedicineSuggestion = {
  text: string;
  match: { medicineId: string; name: string; packSize: string } | null;
};

export type PrescriptionReading = {
  patientName: string;
  doctorName: string;
  doctorRegNo: string;
  prescribedOn: string | null;
  notes: string;
  legible: boolean;
  medicines: MedicineSuggestion[];
};

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

const SYSTEM =
  `You transcribe a scanned medical prescription for a pharmacist to review. Only report what is written on the page. ` +
  `Do NOT diagnose, do NOT infer dosing, do NOT add medicines that are not written. If the image is unclear, set legible=false and return whatever you can. ` +
  `Reply ONLY as JSON: {"patientName": string, "doctorName": string, "doctorRegNo": string, "prescribedOn": "YYYY-MM-DD"|null, ` +
  `"medicines": [{"name": string, "strength": string, "form": string}], "notes": string, "legible": boolean}. ` +
  `prescribedOn: the date written on the prescription in YYYY-MM-DD, or null if none is visible. medicines: each drug exactly as written (brand or salt), with strength and form if shown. ` +
  `Leave any field you cannot read as an empty string.`;

async function loadPages(prescriptionId: string): Promise<{ parts: Part[]; signature: string }> {
  const files = await query<Row>(
    `select storage_key, mime, sha256 from prescription_files where prescription_id = $1 order by position limit $2`,
    [prescriptionId, MAX_PAGES],
  );
  const parts: Part[] = [];
  const sig: string[] = [];
  for (const f of files) {
    try {
      const buf = await getPrescriptionFile(f.storage_key as string);
      parts.push({ inlineData: { mimeType: f.mime as string, data: buf.toString("base64") } });
      sig.push(f.sha256 as string);
    } catch (e) {
      console.error("[ai rx] could not read file", e);
    }
  }
  return { parts, signature: createHash("sha256").update(sig.join("|")).digest("hex") };
}

/** Best-effort match of a free-text drug line to a catalogue product, so the pharmacist can add it in one click. */
async function matchMedicine(text: string): Promise<MedicineSuggestion["match"]> {
  const q = text.replace(/\d+\s*(mg|ml|mcg|g)\b/gi, "").trim();
  if (q.length < 2) return null;
  const { items } = await searchProducts({ q, page: 1, pageSize: 1 } as Parameters<typeof searchProducts>[0]);
  const hit = items[0];
  return hit ? { medicineId: hit.id, name: hit.name, packSize: hit.packSize } : null;
}

/**
 * Read a prescription's images/PDF with Gemini vision and return structured suggestions for the pharmacist to verify.
 * This NEVER approves anything and is never shown to the customer: it only pre-fills the review form.
 * Cached per (prescription, file-set) so re-opening the review costs no quota; new pages invalidate the cache.
 */
export async function readPrescription(prescriptionId: string): Promise<PrescriptionReading | null> {
  const { parts, signature } = await loadPages(prescriptionId);
  if (!parts.length) return null;

  const extracted = await cached<Extracted>("rx-read", `${prescriptionId}:${signature}`, 30 * 24 * 3600, async () => {
    return generateJSON<Extracted>([{ text: "Transcribe this prescription." }, ...parts], {
      system: SYSTEM,
      model: geminiVisionModel(),
      maxOutputTokens: 1024,
      // A prescription photo is a large request; the 20 s shopper default cuts it off.
      timeoutMs: 60_000,
    });
  });

  const rawMeds = Array.isArray(extracted.medicines) ? extracted.medicines.slice(0, 20) : [];
  const medicines: MedicineSuggestion[] = [];
  for (const m of rawMeds) {
    const text = [str(m.name, 120), str(m.strength, 40), str(m.form, 40)].filter(Boolean).join(" ").trim();
    if (!text) continue;
    medicines.push({ text, match: await matchMedicine(str(m.name, 120) || text) });
  }

  return {
    patientName: str(extracted.patientName, 120),
    doctorName: str(extracted.doctorName, 120),
    doctorRegNo: str(extracted.doctorRegNo, 60),
    prescribedOn: isDate(extracted.prescribedOn) ? extracted.prescribedOn : null,
    notes: str(extracted.notes, 500),
    legible: extracted.legible !== false,
    medicines,
  };
}
