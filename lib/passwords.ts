import crypto from "crypto";

// Passwords are stored as  scrypt$<salt-hex>$<hash-hex>.
// Anything that does not match that shape is treated as a legacy plain-text
// password from the demo build: it still lets the person sign in, and the
// login route quietly re-saves it hashed. That way an existing data/db.json
// keeps working and heals itself the first time everyone logs in.

const PREFIX = "scrypt$";
const KEYLEN = 32;

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, KEYLEN);
  return `${PREFIX}${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function isHashed(stored: string): boolean {
  return typeof stored === "string" && stored.startsWith(PREFIX);
}

export function verifyPassword(stored: string, plain: string): boolean {
  if (!stored || typeof plain !== "string" || plain.length === 0) return false;

  if (!isHashed(stored)) {
    // Legacy plain-text row. Compare in constant time anyway.
    const a = Buffer.from(stored);
    const b = Buffer.from(plain);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.scryptSync(plain, Buffer.from(saltHex, "hex"), expected.length);
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
