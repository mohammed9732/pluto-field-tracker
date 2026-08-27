import fs from "fs";
import path from "path";
import { UPLOAD_DIR } from "./db";

/* Where uploaded files actually live — point 5 of the owner's list.
 *
 * Two backends behind one pair of functions:
 *
 *   - Cloudflare R2 (S3-compatible), once the four R2_* variables exist in
 *     the environment. Photos at ~12/day would fill Railway's small volume
 *     in months; R2's free tier holds years of them.
 *   - The local disk otherwise — so development, and a deployment that has
 *     not configured R2 yet, keep working exactly as before.
 *
 * Reads check R2 first and then fall back to disk, so files uploaded before
 * the switch keep opening without any migration step being required. The
 * migration (an owner action in the control panel) just moves the old ones
 * over so the volume can be small again.
 */

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const;

export function r2Configured(): boolean {
  return R2_VARS.every((k) => !!process.env[k]);
}

// The SDK is loaded lazily so a deployment without R2 never pays for it.
let clientPromise: Promise<any> | null = null;
function client() {
  if (!clientPromise) {
    clientPromise = import("@aws-sdk/client-s3").then((m) => ({
      s3: new m.S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      }),
      mod: m,
    }));
  }
  return clientPromise;
}

export async function putFile(id: string, buf: Buffer, mime: string): Promise<"r2" | "disk"> {
  if (r2Configured()) {
    const { s3, mod } = await client();
    await s3.send(new mod.PutObjectCommand({
      Bucket: process.env.R2_BUCKET, Key: id, Body: buf, ContentType: mime,
    }));
    return "r2";
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, id), buf);
  return "disk";
}

export async function getFile(id: string): Promise<Buffer | null> {
  if (r2Configured()) {
    try {
      const { s3, mod } = await client();
      const r = await s3.send(new mod.GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: id }));
      const bytes = await r.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      // fall through — the file may predate R2 and still be on disk
    }
  }
  const p = path.join(UPLOAD_DIR, id);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

/* Move everything still on the local disk into R2. Returns what happened;
 * deletes a local copy only AFTER its upload succeeded, so a half-finished
 * migration can simply be run again. */
export async function migrateDiskToR2(
  ids: { id: string; mime: string }[],
): Promise<{ moved: number; failed: number; alreadyDone: number }> {
  if (!r2Configured()) throw new Error("Cloud storage is not configured yet");
  let moved = 0, failed = 0, alreadyDone = 0;
  for (const { id, mime } of ids) {
    const p = path.join(UPLOAD_DIR, id);
    if (!fs.existsSync(p)) { alreadyDone++; continue; }
    try {
      const buf = fs.readFileSync(p);
      const { s3, mod } = await client();
      await s3.send(new mod.PutObjectCommand({
        Bucket: process.env.R2_BUCKET, Key: id, Body: buf, ContentType: mime,
      }));
      fs.unlinkSync(p);
      moved++;
    } catch {
      failed++;
    }
  }
  return { moved, failed, alreadyDone };
}
