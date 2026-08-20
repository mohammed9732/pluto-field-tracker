import fs from "fs";
import path from "path";
import { getDb, UPLOAD_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

const MOODS = ["idle", "hello", "cheer", "sad"] as const;
type Mood = (typeof MOODS)[number];

/* The mascot, on one URL.
 *
 * Two sources, in order:
 *   1. Artwork uploaded in the control panel — how a company puts its own
 *      character in without touching code.
 *   2. The artwork shipped inside the app, in public/mascot.
 *
 * Falling back on the SERVER rather than in the browser matters: uploads live on
 * the server's disk and are deliberately excluded from git, so a fresh deploy has
 * none. If the fallback lived in the page, every new deployment would show a
 * broken image until somebody remembered to upload four files by hand.
 *
 * Public on purpose — the sign-in screen shows the mascot before anyone has
 * signed in, and the phone fetches it while installing the app.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("mood") ?? "idle";
  const mood: Mood = (MOODS as readonly string[]).includes(raw) ? (raw as Mood) : "idle";

  const headers = {
    "Cache-Control": "public, max-age=3600",
    // Mascot art may be an SVG. Inside an <img> that is already inert, but this
    // also neuters it if someone opens the URL directly as a page.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "X-Content-Type-Options": "nosniff",
  };

  // 1 — whatever the owner uploaded.
  try {
    const s = getDb().settings;
    const uploaded =
      mood === "hello" ? s.mascotHelloId ?? s.mascotIdleId
      : mood === "cheer" ? s.mascotCheerId ?? s.mascotIdleId
      : mood === "sad" ? s.mascotSadId ?? s.mascotIdleId
      : s.mascotIdleId;
    if (uploaded) {
      const meta = getDb().files.find((f) => f.id === uploaded);
      const p = path.join(UPLOAD_DIR, uploaded);
      if (meta && fs.existsSync(p)) {
        return new Response(fs.readFileSync(p), {
          headers: { ...headers, "Content-Type": meta.mime },
        });
      }
    }
  } catch {}

  // 2 — the artwork that ships with the app.
  try {
    const p = path.join(process.cwd(), "public", "mascot", `${mood}.svg`);
    if (fs.existsSync(p)) {
      return new Response(fs.readFileSync(p), {
        headers: { ...headers, "Content-Type": "image/svg+xml" },
      });
    }
  } catch {}

  return new Response(null, { status: 404 });
}
