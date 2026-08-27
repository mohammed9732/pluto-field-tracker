import crypto from "crypto";
import { getDb, saveDb } from "@/lib/db";
import { getFile, putFile } from "@/lib/storage";
import { requireUser, errResponse } from "@/lib/auth";
import { canSeeFile, nowIso } from "@/lib/compute";

const MAX_BYTES = 15 * 1024 * 1024;

// POST multipart form-data { file } → { id, name }
export async function POST(req: Request) {
  try {
    const user = requireUser();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return Response.json({ error: "No file" }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "File is too big (15 MB max)" }, { status: 400 });
    const id = crypto.randomBytes(12).toString("hex");
    const buf = Buffer.from(await file.arrayBuffer());
    // Cloud storage when configured, the local disk otherwise — the caller
    // never knows the difference. See lib/storage.ts.
    await putFile(id, buf, file.type || "application/octet-stream");
    const db = getDb();
    db.files.push({ id, name: file.name || "file", mime: file.type || "application/octet-stream", size: file.size, ownerId: user.id, ts: nowIso() });
    saveDb();
    return Response.json({ id, name: file.name });
  } catch (e) {
    return errResponse(e);
  }
}

// GET ?id=... → streams the file
export async function GET(req: Request) {
  try {
    const user = requireUser();
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!/^[a-f0-9]{24}$/.test(id)) return Response.json({ error: "Bad id" }, { status: 400 });
    const db = getDb();
    // Answer "not found" rather than "forbidden" so this cannot be used to probe
    // which file ids exist.
    if (!canSeeFile(db, user, id)) return Response.json({ error: "Not found" }, { status: 404 });
    const meta = db.files.find((f) => f.id === id);
    if (!meta) return Response.json({ error: "Not found" }, { status: 404 });
    const buf = await getFile(id);
    if (!buf) return Response.json({ error: "Not found" }, { status: 404 });
    // Only render media inline. Anything else downloads, so an uploaded .html or
    // .svg can never execute as a page in a colleague's browser.
    const safeInline = /^(image\/(png|jpe?g|gif|webp|heic|heif)|audio\/|video\/|application\/pdf)/i.test(meta.mime);
    return new Response(buf, {
      headers: {
        "Content-Type": safeInline ? meta.mime : "application/octet-stream",
        "Content-Disposition": `${safeInline ? "inline" : "attachment"}; filename="${encodeURIComponent(meta.name)}"`,
        "Cache-Control": "private, max-age=31536000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return errResponse(e);
  }
}
