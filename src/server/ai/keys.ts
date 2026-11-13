import { geminiKeys } from "../env";

/**
 * Pool of Gemini API keys with round-robin rotation and per-key cooldown. Free-tier keys are rate-limited
 * (per minute and per day), so when one key is throttled we park it briefly and move to the next. This lets a
 * handful of free keys serve many users; combined with the response cache, repeated queries cost nothing.
 */
type Slot = { id: string; key: string; cooldownUntil: number };

let slots: Slot[] = [];
let signature = "";
let pointer = 0;

function pool(): Slot[] {
  const keys = geminiKeys();
  const sig = keys.join("|");
  if (sig !== signature) {
    slots = keys.map((key, i) => ({ id: `k${i + 1}`, key, cooldownUntil: 0 }));
    signature = sig;
    pointer = 0;
  }
  return slots;
}

export function keyCount(): number {
  return pool().length;
}

/** Next key that is not in cooldown, advancing the round-robin pointer. Null when all are parked. */
export function nextKey(): Slot | null {
  const p = pool();
  const now = Date.now();
  for (let i = 0; i < p.length; i++) {
    const slot = p[(pointer + i) % p.length];
    if (slot.cooldownUntil <= now) {
      pointer = (pointer + i + 1) % p.length;
      return slot;
    }
  }
  return null;
}

export function coolDown(id: string, ms: number): void {
  const slot = pool().find((s) => s.id === id);
  if (slot) slot.cooldownUntil = Date.now() + ms;
}
