import { cookies } from "next/headers";
import { getDb, saveDb } from "@/lib/db";
import { sessionCookieFor, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { publicUser } from "@/lib/compute";
import { hashPassword, isHashed, verifyPassword } from "@/lib/passwords";

// Simple in-memory brake on password guessing. Resets when the app restarts,
// which is fine — the point is to stop someone hammering a rep's phone number,
// not to survive a redeploy.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRIES = 10;
const attempts = new Map<string, { count: number; first: number }>();

function tooManyTries(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW_MS) return false;
  return rec.count >= MAX_TRIES;
}

function noteFailure(key: string) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW_MS) attempts.set(key, { count: 1, first: now });
  else rec.count += 1;
  // Keep the map from growing without bound on a long-running server.
  if (attempts.size > 500) {
    for (const [k, v] of Array.from(attempts.entries())) {
      if (now - v.first > WINDOW_MS) attempts.delete(k);
    }
  }
}

export async function POST(req: Request) {
  const { phone, password } = await req.json();
  const norm = (s: string) => String(s || "").replace(/[^0-9+]/g, "");
  const key = norm(phone) || String(phone || "").trim().toLowerCase();

  if (tooManyTries(key)) {
    return Response.json(
      { error: "Too many attempts. Wait 15 minutes and try again." },
      { status: 429 },
    );
  }

  const db = getDb();
  const user = db.users.find(
    (u) =>
      u.active &&
      (norm(u.phone) === norm(phone) ||
        u.name.toLowerCase() === String(phone || "").trim().toLowerCase()),
  );

  if (!user || !verifyPassword(user.password, String(password ?? ""))) {
    noteFailure(key);
    return Response.json({ error: "Wrong phone number or password" }, { status: 401 });
  }

  // Upgrade any leftover plain-text password the moment its owner signs in.
  if (!isHashed(user.password)) {
    user.password = hashPassword(String(password));
    saveDb();
  }

  attempts.delete(key);
  cookies().set(SESSION_COOKIE, sessionCookieFor(user.id), sessionCookieOptions);
  return Response.json({ user: publicUser(user) });
}
