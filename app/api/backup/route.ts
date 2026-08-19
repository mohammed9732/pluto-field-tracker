import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { DATA_DIR } from "@/lib/config";
import { todayStr } from "@/lib/compute";

export const dynamic = "force-dynamic";

// Lets the owner pull the whole database down as one file. The company data
// lives on one disk at the hosting provider; this is how it also lives
// somewhere the company controls.
export async function GET() {
  try {
    requireUser(["admin"]);
    const db = getDb();
    const body = JSON.stringify(db, null, 1);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="pluto-backup-${todayStr()}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errResponse(e);
  }
}

// Lists the automatic daily backups already on the server, so the owner can see
// at a glance that they are being taken.
export async function POST() {
  try {
    requireUser(["admin"]);
    const dir = path.join(DATA_DIR, "backups");
    if (!fs.existsSync(dir)) return Response.json({ backups: [] });
    const backups = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("db-"))
      .sort()
      .reverse()
      .map((f) => {
        const st = fs.statSync(path.join(dir, f));
        return { name: f, sizeKb: Math.round(st.size / 1024) };
      });
    return Response.json({ backups });
  } catch (e) {
    return errResponse(e);
  }
}
