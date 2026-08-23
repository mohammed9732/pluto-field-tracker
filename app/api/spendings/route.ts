import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { currentPeriod, logActivity, notify, nowIso, periodOf, todayStr } from "@/lib/compute";

function enrich(db: ReturnType<typeof getDb>, s: any) {
  return {
    ...s,
    userName: db.users.find((u) => u.id === s.userId)?.name ?? "?",
    decidedByName: s.decidedBy ? db.users.find((u) => u.id === s.decidedBy)?.name ?? "?" : null,
  };
}

export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    if (!db.settings.spendingsEnabled) return Response.json({ enabled: false, spendings: [], summary: [] });
    const scope = new URL(req.url).searchParams.get("scope") ?? "mine";
    let rows = db.spendings.slice();
    if (scope === "mine") rows = rows.filter((s) => s.userId === user.id);
    else if (scope === "approvals") {
      requireUser(["supervisor", "admin", "accountant"]);
      if (user.role === "supervisor") rows = rows.filter((s) => s.status === "pending");
      else rows = rows.filter((s) => ["pending", "supervisor_ok", "approved"].includes(s.status));
    } else requireUser(["supervisor", "admin", "accountant"]);
    rows.sort((a, b) => b.date.localeCompare(a.date));
    // Monthly summary per person (admin dashboard uses this too).
    const period = currentPeriod();
    const summary = db.users.filter((u) => u.active).map((u) => ({
      userId: u.id, name: u.name,
      month: db.spendings.filter((s) => s.userId === u.id && s.date.slice(0, 7) === period && s.status !== "rejected").reduce((x, s) => x + s.amount, 0),
    })).filter((r) => r.month > 0);
    return Response.json({
      enabled: true,
      supervisorStep: db.settings.spendingSupervisorStep,
      spendings: rows.map((s) => enrich(db, s)),
      summary,
    });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "add"|"decide"|"payMonth", ... }
export async function POST(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    if (!db.settings.spendingsEnabled) return Response.json({ error: "Spendings are switched off" }, { status: 403 });
    const b = await req.json();

    if (b.action === "add") {
      const amount = Math.round(Number(b.amount));
      if (!(amount > 0)) return Response.json({ error: "Enter an amount" }, { status: 400 });
      if (!String(b.note ?? "").trim()) return Response.json({ error: "Details are required — say what this spending was for" }, { status: 400 });
      const s = {
        id: nextId(db), userId: user.id, date: b.date ?? todayStr(), amount,
        type: (["gas", "food", "gifts", "accommodation", "other"].includes(b.type) ? b.type : "other") as any,
        note: String(b.note ?? ""), receipt: b.receipt ?? null,
        status: "pending" as const, decidedBy: null, decideNote: null, paidAt: null, paidBy: null,
      };
      db.spendings.push(s);
      const approver = db.settings.spendingSupervisorStep
        ? db.users.find((u) => u.active && u.role === "supervisor")
        : db.users.find((u) => u.active && u.role === "accountant");
      if (approver && approver.id !== user.id) notify(db, () => nextId(db), approver.id, `${user.name} logged a spending — ${amount.toLocaleString()} IQD (${s.type}).`, "/spendings");
      saveDb();
      return Response.json({ ok: true, spending: enrich(db, s) });
    }

    if (b.action === "decide") {
      requireUser(["supervisor", "accountant", "admin"]);
      const s = db.spendings.find((x) => x.id === Number(b.id));
      if (!s) return Response.json({ error: "Not found" }, { status: 404 });
      // Nobody signs off their own expenses, whatever their role. The screen
      // already hides these; the rule belongs here too.
      if (s.userId === user.id && user.role !== "admin") {
        return Response.json({ error: "Someone else has to approve your own claim" }, { status: 403 });
      }
      // A paid claim is settled money — it cannot be retrospectively rejected.
      if (s.status === "paid") {
        return Response.json({ error: "That claim has already been paid" }, { status: 400 });
      }
      if (b.decision === "reject") {
        s.status = "rejected";
        s.decideNote = b.note ? String(b.note) : null;
      } else if (user.role === "supervisor") {
        if (s.status !== "pending") return Response.json({ error: "Already handled" }, { status: 400 });
        s.status = db.settings.spendingSupervisorStep ? "supervisor_ok" : "approved";
      } else {
        s.status = "approved";
      }
      s.decidedBy = user.id;
      notify(db, () => nextId(db), s.userId, `Your ${s.type} spending of ${s.amount.toLocaleString()} IQD was ${s.status === "rejected" ? "rejected" : "approved"}.`, "/spendings");
      logActivity(db, () => nextId(db), user.id, `${s.status === "rejected" ? "rejected" : "approved"} spending #${s.id}`);
      saveDb();
      return Response.json({ ok: true, spending: enrich(db, s) });
    }

    if (b.action === "payMonth") {
      requireUser(["accountant", "admin"]);
      const userId = Number(b.userId);
      const period = String(b.period ?? periodOf(todayStr()));
      let total = 0;
      for (const s of db.spendings) {
        if (s.userId !== userId || s.date.slice(0, 7) !== period) continue;
        if (s.status === "approved" || (s.status === "supervisor_ok" && !db.settings.spendingSupervisorStep)) {
          s.status = "paid";
          s.paidAt = nowIso();
          s.paidBy = user.id;
          total += s.amount;
        }
      }
      notify(db, () => nextId(db), userId, `Your spendings for ${period} were paid back — ${total.toLocaleString()} IQD.`, "/spendings");
      logActivity(db, () => nextId(db), user.id, `paid back ${total.toLocaleString()} IQD spendings to user #${userId}`);
      saveDb();
      return Response.json({ ok: true, total });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return errResponse(e);
  }
}
