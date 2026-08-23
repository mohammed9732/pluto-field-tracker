import { getDb, saveDb, nextId } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import { requireUser, errResponse } from "@/lib/auth";
import { cityName, logActivity, notify, recordChange } from "@/lib/compute";

/* A number from the client, or the value already stored.
 *
 * Commas, blanks and stray text all give NaN from Number(), and NaN written to
 * the JSON file reads back as null — so a mistyped salary would not fail
 * loudly, it would erase the salary. Anything not finite means "no change".
 */
function num(v: unknown, fallback: number): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : fallback;
}


export async function GET() {
  try {
    const user = requireUser(["admin", "accountant"]);
    const db = getDb();
    return Response.json({
      users: db.users.map(({ password, ...u }) => u),
      products: db.products,
      cities: db.settings.cities,
      productLines: db.settings.productLines ?? [],
      chatGroups: db.chatGroups,
      canEdit: user.role === "admin",
    });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "saveUser"|"saveProduct", ... }
export async function POST(req: Request) {
  try {
    const user = requireUser(["admin"]);
    const db = getDb();
    const b = await req.json();
    if (b.action === "saveUser") {
      if (b.id) {
        const u = db.users.find((x) => x.id === Number(b.id));
        if (!u) return Response.json({ error: "User not found" }, { status: 404 });
        Object.assign(u, {
          name: b.name ?? u.name,
          role: b.role ?? u.role,
          city: b.city ?? u.city,
          phone: b.phone ?? u.phone,
          baseSalary: num(b.baseSalary, u.baseSalary),
          dailyMin: num(b.dailyMin, u.dailyMin),
          productLine: b.productLine !== undefined ? (String(b.productLine).trim() || null) : u.productLine,
          active: b.active != null ? !!b.active : u.active,
        });
        if (b.password) {
          u.password = hashPassword(String(b.password));
          recordChange(db, () => nextId(db), user.id, "user", u.id, "password reset", null);
        }
      } else {
        if (!b.name || !b.phone) return Response.json({ error: "Name and phone required" }, { status: 400 });
        db.users.push({
          id: nextId(db), name: String(b.name), role: b.role ?? "rep", city: b.city ?? "erbil",
          phone: String(b.phone), password: hashPassword(String(b.password || "password")),
          baseSalary: num(b.baseSalary, 0), dailyMin: num(b.dailyMin, 5),
          productLine: String(b.productLine ?? "").trim() || null, active: true,
        });
      }
      saveDb();
      return Response.json({ ok: true });
    }
    if (b.action === "saveProduct") {
      if (b.id) {
        const p = db.products.find((x) => x.id === Number(b.id));
        if (!p) return Response.json({ error: "Product not found" }, { status: 404 });
        Object.assign(p, {
          name: b.name ?? p.name, sku: b.sku ?? p.sku,
          unitPrice: num(b.unitPrice, p.unitPrice),
          unit: b.unit ?? p.unit,
          line: b.line !== undefined ? (String(b.line).trim() || null) : p.line,
          active: b.active != null ? !!b.active : p.active,
          imageId: b.imageId !== undefined ? b.imageId : p.imageId,
          brochureId: b.brochureId !== undefined ? b.brochureId : p.brochureId,
          brochureName: b.brochureName !== undefined ? b.brochureName : p.brochureName,
        });
        if (Array.isArray(b.tiers)) {
          p.tiers = b.tiers
            .map((t: any) => ({ minQty: Math.round(Number(t.minQty)), price: Math.round(Number(t.price)) }))
            .filter((t: any) => t.minQty > 1 && t.price > 0)
            .sort((a: any, b2: any) => a.minQty - b2.minQty);
        }
      } else {
        if (!b.name || !b.sku) return Response.json({ error: "Name and SKU required" }, { status: 400 });
        db.products.push({
          id: nextId(db), name: String(b.name), sku: String(b.sku),
          unitPrice: num(b.unitPrice, 0), unit: String(b.unit ?? "box"),
          line: String(b.line ?? "").trim() || null, active: true,
          imageId: b.imageId ?? null, brochureId: b.brochureId ?? null, brochureName: b.brochureName ?? null,
          tiers: Array.isArray(b.tiers)
            ? b.tiers.map((t: any) => ({ minQty: Math.round(Number(t.minQty)), price: Math.round(Number(t.price)) })).filter((t: any) => t.minQty > 1 && t.price > 0)
            : [],
        });
      }
      saveDb();
      return Response.json({ ok: true });
    }
    // Handover: give one rep's city to another, optionally deactivating him.
    if (b.action === "handover") {
      const from = db.users.find((u) => u.id === Number(b.fromId));
      const to = db.users.find((u) => u.id === Number(b.toId));
      if (!from || !to) return Response.json({ error: "Pick both people" }, { status: 400 });
      if (from.id === to.id) return Response.json({ error: "Pick two different people" }, { status: 400 });
      const city = from.city;
      const vacated = to.city;
      // Handing a territory over means the taker leaves his own — say so rather
      // than silently leaving a city with nobody on it.
      const wouldOrphan =
        vacated && vacated !== city && vacated !== "all" &&
        !db.users.some((u) => u.active && u.role === "rep" && u.city === vacated && u.id !== to.id);
      if (wouldOrphan && !b.acceptOrphan) {
        return Response.json({
          needsConfirm: true,
          orphanCity: cityName(db, vacated),
          message: `${to.name} currently covers ${cityName(db, vacated)}. Moving him leaves ${cityName(db, vacated)} with no rep.`,
        });
      }
      to.city = city;
      if (b.deactivate) from.active = false;
      // City stock follows the territory, not the person, so nothing to move.
      logActivity(db, () => nextId(db), user.id, `handed ${cityName(db, city)} from ${from.name} to ${to.name}${b.deactivate ? " and deactivated him" : ""}`);
      notify(db, () => nextId(db), to.id, `You now cover ${cityName(db, city)} — its doctors are in your list.`, "/doctors");
      saveDb();
      return Response.json({ ok: true, orphanedCity: wouldOrphan ? cityName(db, vacated) : null });
    }

    if (b.action === "saveGroup") {
      if (b.id) {
        const g = db.chatGroups.find((x) => x.id === Number(b.id));
        if (!g) return Response.json({ error: "Group not found" }, { status: 404 });
        if (!g.builtin && b.name) g.name = String(b.name);
        if (Array.isArray(b.memberIds)) {
          g.memberIds = b.memberIds.map(Number).filter((id: number) => db.users.some((u) => u.id === id && u.active));
          if (g.name === "Everyone") g.memberIds = db.users.filter((u) => u.active).map((u) => u.id);
        }
      } else {
        if (!b.name) return Response.json({ error: "Group needs a name" }, { status: 400 });
        db.chatGroups.push({
          id: nextId(db), name: String(b.name), builtin: false,
          memberIds: Array.isArray(b.memberIds) ? b.memberIds.map(Number).filter((id: number) => db.users.some((u) => u.id === id && u.active)) : [],
        });
      }
      saveDb();
      return Response.json({ ok: true, chatGroups: db.chatGroups });
    }
    if (b.action === "deleteGroup") {
      const g = db.chatGroups.find((x) => x.id === Number(b.id));
      if (!g) return Response.json({ error: "Group not found" }, { status: 404 });
      if (g.builtin) return Response.json({ error: "Built-in groups can't be deleted" }, { status: 400 });
      db.chatGroups.splice(db.chatGroups.indexOf(g), 1);
      saveDb();
      return Response.json({ ok: true, chatGroups: db.chatGroups });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errResponse(e);
  }
}
