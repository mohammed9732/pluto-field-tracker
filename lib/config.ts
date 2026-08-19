import path from "path";

// Everything the app needs to know about the machine it is running on.
// In development these all have friendly defaults so `npm run dev` just works.
// In production the server refuses to start without a real session secret,
// because a guessable secret means anyone can forge an owner login cookie.

export const IS_PROD = process.env.NODE_ENV === "production";

const DEV_SECRET = "pluto-dev-secret-change-in-production";

// Deliberately a function, not a constant: `next build` runs with
// NODE_ENV=production, and throwing while the build collects routes would fail
// the build on a machine that has no secret set. Checking on first use means the
// error lands where it belongs — on a real sign-in attempt against a misconfigured
// server — instead of blocking the build.
export function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (IS_PROD) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set it to a long random string in " +
        "your hosting provider's environment variables and restart the app.",
    );
  }
  return DEV_SECRET;
}

// Where db.json, uploads/ and backups/ live. On Railway or Render this points
// at the mounted disk (for example /data) so the files survive a redeploy.
export const DATA_DIR: string = process.env.DATA_DIR?.trim() || path.join(process.cwd(), "data");

// Iraq does not observe daylight saving, so a fixed +3 offset is correct
// year-round. The server itself almost always runs in UTC.
export const TZ_OFFSET_MINUTES: number = Number(process.env.TZ_OFFSET_MINUTES ?? 180);

// Set SEED_DEMO=false to start with a clean company: no demo doctors, orders,
// visits or messages — just the one owner account below, who then adds the real
// staff, cities and products from the control panel.
export const SEED_DEMO: boolean = (process.env.SEED_DEMO ?? "true").toLowerCase() !== "false";

export const OWNER = {
  name: process.env.OWNER_NAME?.trim() || "Owner",
  phone: process.env.OWNER_PHONE?.trim() || "+964 750 000 0001",
  password: process.env.OWNER_PASSWORD?.trim() || "password",
};
