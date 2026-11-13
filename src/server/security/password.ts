import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

// scrypt (built into Node, no native add-ons). Stored as scrypt$N$r$p$salt$hash.
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: 128 * n * r * 2 }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), Number(n), Number(r), Number(p));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummy: Promise<string> | undefined;
// Run a verification even when the account does not exist so response time does not reveal it.
export async function burnPasswordCheck(password: string) {
  dummy ??= hashPassword("medneed-dummy-password");
  await verifyPassword(password, await dummy);
}

const COMMON = new Set(["password", "password1", "12345678", "123456789", "1234567890", "qwertyui", "qwerty123", "iloveyou", "11111111", "abc12345", "medneed123"]);

export function passwordProblem(password: string, email?: string | null): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be at most 128 characters.";
  if (COMMON.has(password.toLowerCase())) return "That password is too common. Choose a different one.";
  if (email && password.toLowerCase() === email.toLowerCase()) return "Password cannot be the same as your email.";
  if (/^\d+$/.test(password)) return "Password cannot be only numbers.";
  return null;
}
