import { getDb, saveDb, nextId } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";
import { currentPeriod, notify, nowIso } from "@/lib/compute";

function enrich(db: ReturnType<typeof getDb>, t: any, meId: number) {
  return {
    ...t,
    createdByName: db.users.find((u) => u.id === t.createdBy)?.name ?? "?",
    assigneeNames: t.assigneeIds.map((id: number) => db.users.find((u) => u.id === id)?.name ?? "?"),
    doneCount: t.completions.length,
    totalCount: t.assigneeIds.length,
    myDone: t.completions.some((c: any) => c.userId === meId),
    people: t.assigneeIds.map((id: number) => ({
      id,
      name: db.users.find((u) => u.id === id)?.name ?? "?",
      done: t.completions.some((c: any) => c.userId === id),
      doneAt: t.completions.find((c: any) => c.userId === id)?.doneAt ?? null,
    })),
  };
}

export async function GET(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    if (!db.settings.tasksEnabled) return Response.json({ enabled: false, tasks: [] });
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") ?? "mine";
    let rows = db.tasks.slice();
    if (scope === "mine") rows = rows.filter((t) => t.assigneeIds.includes(user.id));
    else if (scope === "created") rows = rows.filter((t) => t.createdBy === user.id);
    else if (scope === "review") {
      requireUser(["admin", "supervisor", "accountant"]);
      const period = url.searchParams.get("period") ?? currentPeriod();
      rows = rows.filter((t) => (t.dueDate ?? t.createdAt).slice(0, 7) === period);
      if (user.role !== "admin") rows = rows.filter((t) => t.createdBy === user.id);
    } else if (scope === "all") {
      requireUser(["admin", "supervisor", "accountant"]);
      if (user.role !== "admin" && !db.settings.managementSeesAllTasks) {
        return Response.json({ enabled: true, tasks: [], users: [] });
      }
    } else requireUser(["admin", "supervisor", "accountant"]);
    rows.sort((a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || b.createdAt.localeCompare(a.createdAt));
    return Response.json({
      enabled: true,
      tasks: rows.map((t) => enrich(db, t, user.id)),
      users: db.users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name, role: u.role })),
    });
  } catch (e) {
    return errResponse(e);
  }
}

// POST { action: "create"|"done"|"reopen"|"close", ... }
export async function POST(req: Request) {
  try {
    const user = requireUser();
    const db = getDb();
    if (!db.settings.tasksEnabled) return Response.json({ error: "Tasks are switched off" }, { status: 403 });
    const b = await req.json();

    if (b.action === "create") {
      requireUser(["admin", "supervisor", "accountant"]);
      const assigneeIds = Array.from(new Set((b.assigneeIds ?? []).map(Number))).filter((id) => db.users.some((u) => u.id === id && u.active)) as number[];
      if (!b.title || assigneeIds.length === 0) return Response.json({ error: "Title and at least one person required" }, { status: 400 });
      const t = {
        id: nextId(db), title: String(b.title), details: String(b.details ?? ""),
        createdBy: user.id, createdByRole: user.role, assigneeIds, completions: [] as { userId: number; doneAt: string }[],
        dueDate: b.dueDate ?? null, status: "open" as const, createdAt: nowIso(), doneAt: null,
      };
      db.tasks.push(t);
      for (const id of assigneeIds) if (id !== user.id) notify(db, () => nextId(db), id, `New task from ${user.name}: ${t.title}`, "/tasks", "task");
      saveDb();
      return Response.json({ ok: true, task: enrich(db, t, user.id) });
    }

    const t = db.tasks.find((x) => x.id === Number(b.id));
    if (!t) return Response.json({ error: "Task not found" }, { status: 404 });

    if (b.action === "done") {
      if (!t.assigneeIds.includes(user.id)) return Response.json({ error: "Not your task" }, { status: 403 });
      if (!t.completions.some((c) => c.userId === user.id)) t.completions.push({ userId: user.id, doneAt: nowIso() });
      if (t.completions.length >= t.assigneeIds.length) {
        t.status = "done";
        t.doneAt = nowIso();
      }
      if (t.createdBy !== user.id) notify(db, () => nextId(db), t.createdBy, `${user.name} finished: ${t.title} (${t.completions.length}/${t.assigneeIds.length})`, "/tasks", "task");
    } else if (b.action === "reopen") {
      // Only somebody the task belongs to — an assignee undoing their own tick,
      // or the person who set it. Everybody else was able to reopen any task.
      const mine = t.assigneeIds.includes(user.id) || t.createdBy === user.id || user.role === "admin";
      if (!mine) return Response.json({ error: "Not your task" }, { status: 403 });
      t.completions = t.completions.filter((c) => c.userId !== user.id);
      t.status = "open";
      t.doneAt = null;
    } else if (b.action === "close") {
      if (t.createdBy !== user.id && user.role !== "admin") return Response.json({ error: "Only the creator can close" }, { status: 403 });
      t.status = "closed";
    }
    saveDb();
    return Response.json({ ok: true, task: enrich(db, t, user.id) });
  } catch (e) {
    return errResponse(e);
  }
}
