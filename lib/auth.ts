import { cookies } from "next/headers";
import crypto from "crypto";
import { getDb } from "./db";
import { User } from "./types";
import { IS_PROD, sessionSecret } from "./config";

function sign(value: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("hex").slice(0, 24);
}

// Shared by sign-in and sign-out so the flags can never drift apart.
export const SESSION_COOKIE = "pluto_session";
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: IS_PROD, // the live site is HTTPS; localhost is not
  maxAge: 60 * 60 * 24 * 30,
};

export function sessionCookieFor(userId: number): string {
  return `${userId}.${sign(String(userId))}`;
}

export function getSessionUser(): User | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [idStr, sig] = raw.split(".");
  if (!idStr || sig !== sign(idStr)) return null;
  const db = getDb();
  return db.users.find((u) => u.id === Number(idStr) && u.active) ?? null;
}

export function requireUser(roles?: string[]): User {
  const user = getSessionUser();
  if (!user) throw new AuthError(401, "Not signed in");
  if (roles && !roles.includes(user.role)) throw new AuthError(403, "Not allowed");
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errResponse(e: unknown): Response {
  if (e instanceof AuthError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return Response.json({ error: "Server error" }, { status: 500 });
}
