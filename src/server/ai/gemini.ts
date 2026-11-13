import { geminiBase, geminiModel } from "../env";
import { coolDown, keyCount, nextKey } from "./keys";
import { recordUsage } from "./usage";

/** Thrown when no key can serve the request (none configured, all rate-limited, or a bad response). Callers degrade gracefully. */
export class AiUnavailable extends Error {}

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
type Opts = { system?: string; json?: boolean; temperature?: number; maxOutputTokens?: number; model?: string };

// How long a key is parked after a rate-limit (429/503) or a network error. Tunable so tests can run fast
// and operators can adjust for their key mix; defaults suit Gemini's free tier.
const RATE_COOLDOWN_MS = Number(process.env.GEMINI_COOLDOWN_MS) || 60_000;
const NET_COOLDOWN_MS = Math.min(RATE_COOLDOWN_MS, Number(process.env.GEMINI_NET_COOLDOWN_MS) || 15_000);

/** Call Gemini generateContent, rotating across keys on rate-limit / transient errors. */
export async function generate(parts: Part[], opts: Opts = {}): Promise<string> {
  if (keyCount() === 0) throw new AiUnavailable("No Gemini API keys configured.");
  const model = opts.model ?? geminiModel();
  const body = {
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  let lastError = "no key available";
  const attempts = keyCount();
  for (let i = 0; i < attempts; i++) {
    const slot = nextKey();
    if (!slot) break;
    let res: Response;
    try {
      res = await fetch(`${geminiBase()}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(slot.key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      lastError = `network: ${(e as Error).message}`;
      coolDown(slot.id, NET_COOLDOWN_MS);
      recordUsage(slot.id, true);
      continue;
    }
    const failed = res.status >= 400;
    recordUsage(slot.id, failed);
    if (res.status === 429 || res.status === 503) {
      coolDown(slot.id, RATE_COOLDOWN_MS); // key is throttled — park it and try the next
      lastError = `rate/quota ${res.status}`;
      continue;
    }
    const data = (await res.json().catch(() => ({}))) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } };
    if (res.status === 400 && /api key (not valid|expired)|API_KEY_INVALID/i.test(JSON.stringify(data.error ?? ""))) {
      coolDown(slot.id, 3600_000); // a bad/expired key: park it for an hour and try the next one
      lastError = `invalid API key (${slot.id})`;
      continue;
    }
    if (res.status === 400) throw new AiUnavailable(`bad request: ${data.error?.message ?? "400"}`); // not a key problem; stop
    if (failed) {
      lastError = `gemini ${res.status}: ${data.error?.message ?? ""}`;
      continue;
    }
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    if (!text) {
      lastError = "empty response";
      continue;
    }
    return text;
  }
  throw new AiUnavailable(`AI unavailable (${lastError}).`);
}

export async function generateJSON<T>(parts: Part[], opts: Opts = {}): Promise<T> {
  const text = await generate(parts, { ...opts, json: true });
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        /* fall through */
      }
    }
    throw new AiUnavailable("AI returned invalid JSON.");
  }
}
