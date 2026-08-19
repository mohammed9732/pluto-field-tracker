import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { cityIds, cityName, hqCityId, logActivity, notify, nowIso, stockCityIds, todayStr, weekStartOf } from "@/lib/compute";
import { StockLocation } from "@/lib/types";

// Locations = main warehouse + every city the admin has defined.
function locations(db: ReturnType<typeof getDb>): StockLocation[] {
  return ["main", ...stockCityIds(db)];
}

function stockView(db: ReturnType<typeof getDb>) {
  const locs = locations(db);
  return db.products.filter((p) => p.active).map((p) => {
    const at = (loc: StockLocation) => db.stock.find((s) => s.productId === p.id && s.location === loc)?.qty ?? 0;
    const row = db.stock.find((s) => s.productId === p.id && s.location === "main");
    const byLocation: Record<string, number> = {};
    for (const l of locs) byLocation[l] = at(l);
    return {
      productId: p.id, name: p.name, sku: p.sku, unit: p.unit,
      byLocation,
      total: locs.reduce((s, l) => s + at(l), 0),
      expiry: row?.expiry ?? null,
    };
  });
}

// GET — stock is visible to everyone (company + per city).
export async function GET() {
  try {
    const user = requireUser();
    const db = getDb();
    const isMgmt = user.role !== "rep";
    // A rep in a city holds that city's stock; Erbil/HQ people work from main.
    const cityHasOwnStock = stockCityIds(db).includes(user.city);
    const myCity: StockLocation = user.role === "rep" && cityHasOwnStock ? user.city : "main";
    const weekStart = weekStartOf(todayStr());
    const myCheckDone = db.stockChecks.some((c) => c.userId === user.id && c.weekStart === weekStart);
    // "Last matched" per location: main = accountant's count upload / edit,
    // city = the last weekly check the accountant accepted or reviewed.
    const lastMatched: Record<string, { ts: string | null; by: string | null; kind: string }> = {};
    for (const loc of locations(db)) {
      if (loc === "main") {
        const rows = db.stock.filter((x) => x.location === "main");
        const newest = rows.map((r) => r.updatedAt).sort().pop() ?? null;
        const who = rows.find((r) => r.updatedAt === newest)?.updatedBy ?? null;
        lastMatched[loc] = { ts: newest, by: who ? db.users.find((u) => u.id === who)?.name ?? null : null, kind: "count" };
      } else {
        const checks = db.stockChecks.filter((c) => c.city === loc && c.reviewedBy).sort((a, b) => a.ts.localeCompare(b.ts));
        const last = checks[checks.length - 1] ?? null;
        lastMatched[loc] = last
          ? { ts: last.ts, by: db.users.find((u) => u.id === last.reviewedBy!)?.name ?? null, kind: "check" }
          : { ts: null, by: null, kind: "check" };
      }
    }
    return Response.json({
      lastMatched,
      stock: stockView(db),
      locations: locations(db).map((id) => ({
        id,
        name: id === "main" ? `${cityName(db, hqCityId(db))} (main)` : cityName(db, id),
      })),
      myCity,
      lowThreshold: db.settings.lowStockThreshold,
      weeklyStockCheck: db.settings.weeklyStockCheck,
      mustCheck: db.settings.weeklyStockCheck && user.role === "rep" && myCity !== "main" && !myCheckDone,
      myCityLabel: cityName(db, myCity),
      uploads: isMgmt ? db.stockUploads.slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5).map((u) => ({ ...u, uploadedByName: db.users.find((x) => x.id === u.uploadedBy)?.name ?? "?" })) : [],
      transfers: isMgmt ? db.stockTransfers.slice().sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 15).map((t) => ({
        ...t, byName: db.users.find((x) => x.id === t.by)?.name ?? "?",
        productName: db.products.find((p) => p.id === t.productId)?.name ?? "?",
      })) : [],
      checks: isMgmt ? db.stockChecks.slice().sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 10).map((c) => ({
        ...c, userName: db.users.find((x) => x.id === c.userId)?.name ?? "?",
        rows: c.rows.map((r) => ({ ...r, productName: db.products.find((p) => p.id === r.productId)?.name ?? "?" })),
        hasDiff: c.rows.some((r) => r.counted !== r.system),
      })) : [],
    });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "upload" | "transfer" | "submitCheck" | "reviewCheck", ... }
export async function POST(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const b = await req.json();

    // Excel stock COUNT — replaces quantities at the MAIN warehouse.
    if (b.action === "upload" || (!b.action && b.rows)) {
      requireUser(["accountant", "admin"]);
      const errors: string[] = [];
      let processed = 0;
      for (let i = 0; i < (b.rows ?? []).length; i++) {
        const r = b.rows[i];
        const sku = String(r.sku ?? "").trim();
        const product = db.products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
        if (!product) { errors.push(`Row ${i + 2}: SKU "${sku}" unknown — skipped`); continue; }
        const qty = Number(r.qty);
        if (!Number.isFinite(qty) || qty < 0) { errors.push(`Row ${i + 2}: bad quantity "${r.qty}" — skipped`); continue; }
        let s = db.stock.find((x) => x.productId === product.id && x.location === "main");
        if (!s) {
          s = { productId: product.id, location: "main", qty: 0, batch: null, expiry: null, updatedAt: nowIso(), updatedBy: user.id };
          db.stock.push(s);
        }
        s.qty = qty;
        s.batch = r.batch ? String(r.batch) : s.batch;
        s.expiry = r.expiry ? String(r.expiry) : s.expiry;
        s.updatedAt = nowIso();
        s.updatedBy = user.id;
        processed++;
      }
      db.stockUploads.push({ id: nextId(db), filename: String(b.filename ?? "upload.xlsx"), uploadedBy: user.id, at: nowIso(), rowsProcessed: processed, errors });
      saveDb();
      return Response.json({ ok: true, processed, errors });
    }

    if (b.action === "transfer") {
      requireUser(["accountant", "admin"]);
      const product = db.products.find((p) => p.id === Number(b.productId));
      const qty = Math.round(Number(b.qty));
      const locs = locations(db);
      const from = locs.includes(b.from) ? b.from : "main";
      const to = locs.includes(b.to) ? b.to : null;
      if (!product || !(qty > 0) || !to || from === to) return Response.json({ error: "Pick a product, quantity, and destination" }, { status: 400 });
      const src = db.stock.find((s) => s.productId === product.id && s.location === from);
      if (!src || src.qty < qty) return Response.json({ error: `Only ${src?.qty ?? 0} in ${from}` }, { status: 400 });
      let dst = db.stock.find((s) => s.productId === product.id && s.location === to);
      if (!dst) {
        dst = { productId: product.id, location: to, qty: 0, batch: src.batch, expiry: src.expiry, updatedAt: nowIso(), updatedBy: user.id };
        db.stock.push(dst);
      }
      src.qty -= qty;
      dst.qty += qty;
      src.updatedAt = dst.updatedAt = nowIso();
      src.updatedBy = dst.updatedBy = user.id;
      db.stockTransfers.push({ id: nextId(db), productId: product.id, qty, from, to, by: user.id, ts: nowIso(), note: String(b.note ?? "") });
      const cityRep = db.users.find((u) => u.active && u.role === "rep" && u.city === to);
      if (cityRep) notify(db, () => nextId(db), cityRep.id, `${qty} × ${product.name} transferred to your ${to} stock.`, "/stock");
      logActivity(db, () => nextId(db), user.id, `transferred ${qty} × ${product.name} ${from} → ${to}`);
      saveDb();
      return Response.json({ ok: true });
    }

    if (b.action === "submitCheck") {
      requireUser(["rep"]);
      const city: StockLocation | null = stockCityIds(db).includes(user.city) ? user.city : null;
      if (!city) return Response.json({ error: "Weekly checks are for reps who hold their own city stock" }, { status: 400 });
      const weekStart = weekStartOf(todayStr());
      if (db.stockChecks.some((c) => c.userId === user.id && c.weekStart === weekStart)) {
        return Response.json({ error: "You already submitted this week's check" }, { status: 400 });
      }
      const rows = (b.rows ?? []).map((r: any) => {
        const system = db.stock.find((s) => s.productId === Number(r.productId) && s.location === city)?.qty ?? 0;
        return { productId: Number(r.productId), counted: Math.max(0, Math.round(Number(r.counted) || 0)), system };
      });
      const check = { id: nextId(db), userId: user.id, city, weekStart, rows, note: String(b.note ?? ""), ts: nowIso(), reviewedBy: null };
      db.stockChecks.push(check);
      const diffs = rows.filter((r: any) => r.counted !== r.system).length;
      const acct = db.users.find((u) => u.active && u.role === "accountant");
      if (acct) notify(db, () => nextId(db), acct.id, `${user.name} submitted the weekly ${city} stock check${diffs ? ` — ${diffs} difference${diffs === 1 ? "" : "s"}!` : " — all matching."}`, "/acct/stock");
      saveDb();
      return Response.json({ ok: true, diffs });
    }

    if (b.action === "reviewCheck") {
      requireUser(["accountant", "admin"]);
      const check = db.stockChecks.find((c) => c.id === Number(b.id));
      if (!check) return Response.json({ error: "Check not found" }, { status: 404 });
      check.reviewedBy = user.id;
      // Optionally apply counted quantities to the city stock.
      if (b.applyCounts) {
        for (const r of check.rows) {
          let s = db.stock.find((x) => x.productId === r.productId && x.location === check.city);
          if (!s) {
            s = { productId: r.productId, location: check.city, qty: 0, batch: null, expiry: null, updatedAt: nowIso(), updatedBy: user.id };
            db.stock.push(s);
          }
          s.qty = r.counted;
          s.updatedAt = nowIso();
          s.updatedBy = user.id;
        }
        logActivity(db, () => nextId(db), user.id, `applied ${check.city} stock check counts (week ${check.weekStart})`);
      }
      saveDb();
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errResponse(e);
  }
}
