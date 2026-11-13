export type SaltInput = { name: string; strength: string };

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "item"
  );
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Tidy a salt name without changing its meaning: collapse spaces, keep the author's capitalisation. */
export const cleanSaltName = (s: string) => squash(s);

/** "500 mg" and "500MG" are the same strength. Used only for matching, never for display. */
export function normalizeStrength(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/(\d)\.0+(?=\D|$)/g, "$1");
}

/**
 * Parse the usual Indian composition string: "Amoxycillin (500mg) + Clavulanic Acid (125mg)".
 * A salt without brackets has no strength. Returns [] for an empty string.
 */
export function parseComposition(input: string): SaltInput[] {
  return input
    .split("+")
    .map((part) => squash(part))
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
      return m ? { name: cleanSaltName(m[1]), strength: squash(m[2]) } : { name: cleanSaltName(part), strength: "" };
    })
    .filter((s) => s.name.length > 0);
}

export const formatComposition = (salts: SaltInput[]) =>
  salts.map((s) => (s.strength ? `${s.name} (${s.strength})` : s.name)).join(" + ");

/**
 * Two medicines are substitutes only if they contain exactly the same salts at exactly the same strengths.
 * The key is order-independent. Empty for products with no salts (devices), which never have substitutes.
 */
export function compositionKey(salts: SaltInput[]) {
  return salts
    .map((s) => `${squash(s.name).toLowerCase()}:${normalizeStrength(s.strength)}`)
    .sort()
    .join("+");
}

export function buildSearchText(parts: { name: string; manufacturer: string; salts: SaltInput[]; uses: string[]; category?: string }) {
  return squash(
    [parts.name, ...parts.salts.map((s) => s.name), parts.manufacturer, parts.category ?? "", ...parts.uses].join(" ").toLowerCase(),
  );
}

/** Escape a user string for use inside ILIKE. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
