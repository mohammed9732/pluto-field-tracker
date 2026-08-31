import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { availableStock, cityName, currentPeriod, currentQuarter, monthlyAccrual, productsFor, quarterAccrual, sellerLocation } from "@/lib/compute";

export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    const url = new URL(req.url);
    const period = url.searchParams.get("period") ?? currentPeriod();
    let userId = Number(url.searchParams.get("userId") ?? user.id);
    if (user.role === "rep") userId = user.id;
    const targets = db.targets.filter((t) => t.userId === userId && t.period === period);
    // The list is scoped to the person being LOOKED AT, not the viewer — a
    // supervisor setting targets for an aesthetics rep should see that rep's
    // range, not their own.
    const subject = db.users.find((u) => u.id === userId) ?? user;
    const accrual = monthlyAccrual(db, userId, period);
    const quarter = quarterAccrual(db, userId, currentQuarter());
    // What the order sheet may promise: per product, what is still
    // available in the CURRENT user's own warehouse — on hand minus what
    // other pending/approved orders already claim. The sheet blocks the +
    // at this number so an order that would bounce is never even built.
    const loc = sellerLocation(db, user.id);
    const stockLeft: Record<number, number> = {};
    for (const p of productsFor(db, user)) stockLeft[p.id] = Math.max(0, availableStock(db, p.id, loc).available);
    return Response.json({
      targets, accrual, quarter: { name: currentQuarter(), ...quarter },
      products: productsFor(db, subject), stockLeft, stockCity: cityName(db, loc),
    });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { userId, period, rows: [{productId, targetQty, minPct, incentivePct}] }
export async function POST(req: Request) {
  try {
    const user = requireUser(["supervisor", "admin"]);
    const db = getDb();
    const b = await req.json();
    const userId = Number(b.userId);
    const period = String(b.period);
    if (!/^\d{4}-\d{2}$/.test(period)) return Response.json({ error: "Bad period" }, { status: 400 });
    for (const r of b.rows ?? []) {
      const existing = db.targets.find((t) => t.userId === userId && t.productId === Number(r.productId) && t.period === period);
      const qty = Number(r.targetQty);
      if (!(qty > 0)) {
        if (existing) db.targets.splice(db.targets.indexOf(existing), 1);
        continue;
      }
      if (existing) {
        existing.targetQty = qty;
        existing.minPct = Number(r.minPct) || 70;
        existing.incentivePct = Number(r.incentivePct) || 0;
        existing.setBy = user.id;
      } else {
        db.targets.push({
          id: nextId(db), userId, productId: Number(r.productId), period,
          targetQty: qty, minPct: Number(r.minPct) || 70, incentivePct: Number(r.incentivePct) || 0, setBy: user.id,
        });
      }
    }
    saveDb();
    return Response.json({ ok: true });
  } catch (e) {
    return errResponse(e);
  }
}
