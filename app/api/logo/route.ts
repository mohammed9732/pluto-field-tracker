import fs from "fs";
import path from "path";
import { getDb, UPLOAD_DIR } from "@/lib/db";

export const dynamic = "force-dynamic";

// Deliberately public: the sign-in screen shows the logo before anyone has
// signed in, and the phone fetches it as the home-screen icon during install.
// A company logo is not a secret.
export async function GET() {
  try {
    const db = getDb();
    const id = db.settings.logoId;
    if (!id) return new Response(null, { status: 404 });
    const meta = db.files.find((f) => f.id === id);
    const p = path.join(UPLOAD_DIR, id);
    if (!meta || !fs.existsSync(p)) return new Response(null, { status: 404 });
    return new Response(fs.readFileSync(p), {
      headers: {
        "Content-Type": meta.mime,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
