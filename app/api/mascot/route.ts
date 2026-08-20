import fs from "fs";
import path from "path";
import { getDb, UPLOAD_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public, like the logo: the sign-in screen shows the mascot before anyone has
// signed in. GET /api/mascot?mood=hello — falls back to idle art, then 404,
// at which point the component draws the built-in wolf instead.
export async function GET(req: Request) {
  try {
    const mood = new URL(req.url).searchParams.get("mood") ?? "idle";
    const db = getDb();
    const s = db.settings;
    const pick =
      mood === "hello" ? s.mascotHelloId ?? s.mascotIdleId
      : mood === "cheer" ? s.mascotCheerId ?? s.mascotIdleId
      : mood === "sad" ? s.mascotSadId ?? s.mascotIdleId
      : s.mascotIdleId;
    if (!pick) return new Response(null, { status: 404 });
    const meta = db.files.find((f) => f.id === pick);
    const p = path.join(UPLOAD_DIR, pick);
    if (!meta || !fs.existsSync(p)) return new Response(null, { status: 404 });
    return new Response(fs.readFileSync(p), {
      // An hour, not minutes: this is a 200KB image on a rep's mobile data and it
      // barely ever changes. The cost of it being an hour stale after you upload
      // new artwork is far lower than re-downloading it all day.
      headers: { "Content-Type": meta.mime, "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
