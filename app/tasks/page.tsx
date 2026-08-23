"use client";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, dmy } from "@/lib/fmt";

// Task colors by who assigned them: accountant = green, supervisor = blue, admin = violet.
const ROLE_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  accountant: { bg: "var(--c-green-soft)", text: "var(--c-green-deep)", label: "Accountant" },
  supervisor: { bg: "var(--color-accent-100)", text: "var(--color-accent-800)", label: "Supervisor" },
  admin: { bg: "var(--c-violet-soft)", text: "var(--c-violet-deep)", label: "Owner" },
  rep: { bg: "var(--color-neutral-200)", text: "var(--color-neutral-800)", label: "Rep" },
};

export default function Tasks() {
  const tx = useT();
  const me = useMe();
  const [data, setData] = useState<any>(null);
  const [created, setCreated] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<{ title: string; details: string; assigneeIds: number[]; dueDate: string }>({ title: "", details: "", assigneeIds: [], dueDate: "" });
  const [err, setErr] = useState("");

  const canCreate = me && me.role !== "rep";

  const [review, setReview] = useState<any[] | null>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);

  const load = useCallback(() => {
    api("/api/tasks?scope=mine").then(setData).catch(() => {});
    api("/api/tasks?scope=created").then((r: any) => setCreated(r.tasks ?? [])).catch(() => {});
    if (canCreate) {
      api("/api/tasks?scope=review").then((r: any) => setReview(r.tasks ?? [])).catch(() => {});
      api("/api/tasks?scope=all").then((r: any) => setAllTasks(r.tasks ?? [])).catch(() => {});
    }
  }, [canCreate]);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  if (!data.enabled) return <Screen me={me}><div className="card muted">{tx("task.tasksAreSwitchedOff", "Tasks are switched off by the admin.")}</div></Screen>;

  async function create() {
    setErr("");
    if (!form.title.trim() || form.assigneeIds.length === 0) { setErr("Title and at least one person required"); return; }
    await api("/api/tasks", { json: { action: "create", ...form } });
    setForm({ title: "", details: "", assigneeIds: [], dueDate: "" });
    setShowNew(false);
    load();
  }

  function togglePerson(id: number) {
    setForm((f) => ({ ...f, assigneeIds: f.assigneeIds.includes(id) ? f.assigneeIds.filter((x) => x !== id) : [...f.assigneeIds, id] }));
  }

  const TaskCard = ({ t, mineToDo }: { t: any; mineToDo: boolean }) => {
    const c = ROLE_COLOR[t.createdByRole] ?? ROLE_COLOR.rep;
    const finished = mineToDo ? t.myDone : t.status !== "open";
    return (
      <div className="card" style={{ gap: 8, padding: 12, borderLeft: `4px solid ${c.text}` }}>
        <div className="row gap-2">
          <div className="f1min">
            <div style={{ fontSize: 13, fontWeight: 500, textDecoration: finished ? "line-through" : undefined, color: finished ? "var(--color-neutral-500)" : undefined }}>{t.title}</div>
            <div className="small muted">
              {mineToDo ? `from ${t.createdByName}` : `for ${t.assigneeNames.join(", ")}`}
              {t.dueDate ? ` · due ${dmy(t.dueDate)}` : ""}
            </div>
          </div>
          <span className="tag" style={{ background: c.bg, color: c.text }}>{c.label}</span>
        </div>
        {t.details ? <div style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>{t.details}</div> : null}
        {t.totalCount > 1 ? (
          <div className="row" style={{ gap: 6, flexWrap: "wrap", fontSize: 12 }}>
            {t.people.map((p: any) => (
              <span key={p.id} className={`tag ${p.done ? "tag-ok" : "tag-neutral"}`}>{p.done ? "✓ " : ""}{p.name.split(" ")[0]}</span>
            ))}
            <span className="small muted" style={{ marginLeft: "auto" }}>{t.doneCount}/{t.totalCount} done</span>
          </div>
        ) : null}
        {mineToDo && !t.myDone && t.status === "open" ? (
          <button className="btn btn-primary btn-block" style={{ padding: 9 }} onClick={async () => { await api("/api/tasks", { json: { action: "done", id: t.id } }); load(); }}>
            {tx("task.markDone", "Mark done")}
          </button>
        ) : null}
        {mineToDo && t.myDone && t.status === "open" ? <div className="small" style={{ color: "var(--c-green-deep)" }}>{tx("task.yourPartIsDone", "Your part is done — waiting for the others")}</div> : null}
        {t.status === "done" ? <div className="small" style={{ color: "var(--c-green-deep)" }}>Done {t.doneAt ? dmy(t.doneAt) : ""}</div> : null}
        {!mineToDo && t.status === "done" ? (
          <button className="btn btn-secondary btn-block" style={{ padding: 8, fontSize: 12 }} onClick={async () => { await api("/api/tasks", { json: { action: "close", id: t.id } }); load(); }}>
            {tx("task.verifiedCloseIt", "Verified — close it")}
          </button>
        ) : null}
      </div>
    );
  };

  const openMine = data.tasks.filter((t: any) => t.status === "open");
  const doneMine = data.tasks.filter((t: any) => t.status !== "open").slice(0, 5);
  const openCreated = created.filter((t: any) => t.status !== "closed" && !(t.assigneeIds.length === 1 && t.assigneeIds[0] === me.id));

  return (
    <Screen me={me}>
      <div className="row">
        <h4 className="m0 f1">{tx("task.tasks", "Tasks")}</h4>
        {canCreate ? <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setShowNew((s) => !s)}>＋ Assign task</button> : null}
      </div>

      {showNew ? (
        <div className="card gap-3">
          <div className="field m0"><label>{tx("task.task", "Task")}</label><input className="input" placeholder={tx("task.eGCollectPaymentPh", "e.g. Collect payment from Dr. Rebin")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field m0"><label>{tx("task.details", "Details")}</label><textarea className="input" style={{ minHeight: 50 }} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
          <div className="field m0">
            <label>{tx("task.whoPickOneOr", "Who — pick one or many")}</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <button type="button" className="tag tag-outline" style={{ cursor: "pointer", background: "transparent" }}
                onClick={() => setForm((f) => ({ ...f, assigneeIds: data.users.filter((u: any) => u.role === "rep").map((u: any) => u.id) }))}>{tx("task.allReps", "All reps")}</button>
              <button type="button" className="tag tag-outline" style={{ cursor: "pointer", background: "transparent" }}
                onClick={() => setForm((f) => ({ ...f, assigneeIds: data.users.filter((u: any) => u.id !== me.id).map((u: any) => u.id) }))}>{tx("task.everyone", "Everyone")}</button>
              <button type="button" className="tag tag-neutral" style={{ cursor: "pointer", border: "none" }}
                onClick={() => setForm((f) => ({ ...f, assigneeIds: [] }))}>{tx("task.clear", "Clear")}</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {data.users.filter((u: any) => u.id !== me.id).map((u: any) => (
                <button key={u.id} type="button" onClick={() => togglePerson(u.id)}
                  className={`tag ${form.assigneeIds.includes(u.id) ? "tag-accent" : "tag-neutral"}`}
                  style={{ cursor: "pointer", border: "none", padding: "5px 12px" }}>
                  {u.name}
                </button>
              ))}
            </div>
          </div>
          <div className="field m0"><label>Due</label><input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          {err ? <div className="tag tag-hot self-start">{err}</div> : null}
          <button className="btn btn-primary btn-block p-3" onClick={create}>{tx("task.assign", "Assign")}</button>
        </div>
      ) : null}

      {openMine.length ? <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("task.myTasks", "My tasks")}</h6> : null}
      {openMine.map((t: any) => <TaskCard key={t.id} t={t} mineToDo />)}
      {openMine.length === 0 ? <div className="card muted">{tx("task.noOpenTasksFor", "No open tasks for you — nice.")}</div> : null}

      {openCreated.length ? (
        <>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("task.assignedByMe", "Assigned by me")}</h6>
          {openCreated.map((t: any) => <TaskCard key={t.id} t={t} mineToDo={false} />)}
        </>
      ) : null}

      {doneMine.length ? (
        <>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("task.recentlyFinished", "Recently finished")}</h6>
          {doneMine.map((t: any) => <TaskCard key={t.id} t={t} mineToDo />)}
        </>
      ) : null}

      {canCreate && me.role !== "admin" ? (() => {
        const others = allTasks.filter((t: any) => t.createdBy !== me.id && t.status === "open" && !t.assigneeIds.includes(me.id));
        if (!others.length) return null;
        return (
          <div className="stack-2">
            <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>{tx("task.assignedByOthers", "Assigned by others")}</h6>
            {others.map((t: any) => <TaskCard key={t.id} t={t} mineToDo={false} />)}
          </div>
        );
      })() : null}

      {canCreate && review ? (
        <div className="stack-2">
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)" }}>
            This month&apos;s review — {review.filter((t: any) => t.status !== "open").length} finished · {review.filter((t: any) => t.status === "open").length} still open
          </h6>
          {review.map((t: any) => (
            <div key={t.id} className="listrow" style={{ padding: "7px 0", fontSize: 12 }}>
              <div className="f1min">
                <div style={{ fontSize: 12, fontWeight: 500 }}>{t.title}</div>
                <div className="small muted">{t.createdByName} → {t.assigneeNames.join(", ")}{t.dueDate ? ` · due ${dmy(t.dueDate)}` : ""}</div>
              </div>
              {t.status === "open" && t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10)
                ? <span className="tag tag-hot">{tx("task.overdue", "Overdue")}</span>
                : t.status === "open"
                  ? <span className="tag tag-warn">{t.doneCount}/{t.totalCount}</span>
                  : <span className="tag tag-ok">{tx("task.done", "Done")}</span>}
            </div>
          ))}
          {review.length === 0 ? <div className="small muted">{tx("task.noTasksDatedThis", "No tasks dated this month.")}</div> : null}
        </div>
      ) : null}

      <div className="hint mt-auto">
        Green tasks come from the accountant (payments), blue from the supervisor (field duties), violet from the owner. Nothing disappears — every month&apos;s tasks stay reviewable here.
      </div>
    </Screen>
  );
}
