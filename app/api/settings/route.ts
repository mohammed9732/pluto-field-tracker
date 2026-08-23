import { getDb, saveDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { DEFAULT_TERMS } from "@/lib/types";
import { parseHex } from "@/lib/brand";

// GET → settings (everyone; the client uses toggles to show/hide features)
export async function GET() {
  try {
    requireUser();
    const db = getDb();
    return Response.json({ settings: db.settings });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { patch: Partial<Settings> } — admin only, except:
// supervisor may flip repsCanAddDoctors when supervisorCanToggleRepAdd is on.
export async function POST(req: Request) {
  try {
    const user = requireUser(["admin", "supervisor"]);
    const db = getDb();
    const { patch } = await req.json();
    if (!patch || typeof patch !== "object") return Response.json({ error: "Nothing to change" }, { status: 400 });
    if (user.role === "supervisor") {
      const keys = Object.keys(patch);
      if (!db.settings.supervisorCanToggleRepAdd || keys.some((k) => k !== "repsCanAddDoctors")) {
        return Response.json({ error: "Only the owner can change that" }, { status: 403 });
      }
    }
    const numeric = ["pingMinutes", "dwellRadiusM", "visitRadiusM", "planVisitTarget", "planBackupTarget", "supervisorPlanVisitTarget", "supervisorPlanBackupTarget", "lowStockThreshold", "expiryWarnMonths", "checkinNudgeHour"];
    const decimals = ["salesCommissionPct", "collectionCommissionPct"];
    for (const [k, v] of Object.entries(patch)) {
      if (!(k in db.settings)) continue;
      if (k === "cities") {
        requireUser(["admin"]);
        const list = Array.isArray(v) ? v : [];
        const cleaned = list
          .map((c: any) => ({
            id: String(c.id ?? c.name ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name: String(c.name ?? "").trim(),
          }))
          .filter((c: any) => c.id && c.name)
          .filter((c: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === c.id) === i);
        if (!cleaned.length) return Response.json({ error: "Keep at least one city" }, { status: 400 });
        // A city still assigned to a user or doctor can't be removed.
        for (const old of db.settings.cities) {
          if (cleaned.some((c: any) => c.id === old.id)) continue;
          const usedBy = db.users.some((u) => u.active && u.city === old.id) || db.doctors.some((d) => d.city === old.id);
          if (usedBy) return Response.json({ error: `${old.name} is still used by a user or doctor — reassign them first` }, { status: 400 });
        }
        db.settings.cities = cleaned;
        continue;
      }
      if (k === "productLines") {
        requireUser(["admin"]);
        const cleaned = (Array.isArray(v) ? v : [])
          .map((x: any) => String(x ?? "").trim())
          .filter(Boolean)
          .filter((x: string, i: number, arr: string[]) => arr.indexOf(x) === i)
          .slice(0, 20);
        // Same rule as cities: a line still assigned to somebody cannot just
        // disappear, or that rep silently loses their whole catalogue.
        for (const old of db.settings.productLines ?? []) {
          if (cleaned.includes(old)) continue;
          const usedBy = db.users.some((u) => u.active && u.productLine === old)
            || db.products.some((p) => p.active && p.line === old);
          if (usedBy) {
            return Response.json({ error: `"${old}" is still assigned to a user or product — move them first` }, { status: 400 });
          }
        }
        db.settings.productLines = cleaned;
        continue;
      }
      if (k === "terms") {
        requireUser(["admin"]);
        // Blank fields fall back to the default word rather than showing nothing.
        const incoming = (v ?? {}) as Record<string, unknown>;
        const next = { ...DEFAULT_TERMS, ...db.settings.terms };
        for (const key of Object.keys(DEFAULT_TERMS) as (keyof typeof DEFAULT_TERMS)[]) {
          const word = String(incoming[key] ?? "").trim();
          next[key] = word || DEFAULT_TERMS[key];
        }
        db.settings.terms = next;
        continue;
      }
      if (k === "brandColor") {
        requireUser(["admin"]);
        const hex = String(v ?? "").trim();
        if (parseHex(hex)) db.settings.brandColor = hex.startsWith("#") ? hex : `#${hex}`;
        continue;
      }
      if (k === "mascotIdleId" || k === "mascotHelloId" || k === "mascotCheerId" || k === "mascotSadId") {
        requireUser(["admin"]);
        (db.settings as any)[k] = v ? String(v) : null;
        continue;
      }
      if (k === "logoId") {
        requireUser(["admin"]);
        db.settings.logoId = v ? String(v) : null;
        continue;
      }
      if (k === "loginFooter") {
        requireUser(["admin"]);
        db.settings.loginFooter = String(v ?? "").slice(0, 200);
        continue;
      }
      if (numeric.includes(k)) (db.settings as any)[k] = Math.max(0, Number(v) || 0);
      else if (decimals.includes(k)) (db.settings as any)[k] = Math.max(0, Math.round((Number(v) || 0) * 100) / 100);
      else if (k === "dmPolicy") (db.settings as any)[k] = ["management", "none", "all"].includes(String(v)) ? String(v) : "management";
      else if (typeof (db.settings as any)[k] === "boolean") (db.settings as any)[k] = !!v;
      else (db.settings as any)[k] = String(v);
    }
    saveDb();
    return Response.json({ ok: true, settings: db.settings });
  } catch (e) {
    return errResponse(e);
  }
}
