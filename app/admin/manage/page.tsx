"use client";
import { useTerms, roleLabel } from "@/lib/terms";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, groupDigits, money, ungroup } from "@/lib/fmt";

export default function Manage() {
  const tx = useT();
  const me = useMe();
  const t = useTerms();
  const [data, setData] = useState<any>(null);
  const [editUser, setEditUser] = useState<any>(null);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [handover, setHandover] = useState<{ fromId: string; toId: string; deactivate: boolean } | null>(null);
  const [hoErr, setHoErr] = useState("");
  // Drag-and-drop product ordering: a local copy while dragging, saved on drop.
  const [prods, setProds] = useState<any[] | null>(null);
  const [drag, setDrag] = useState<number | null>(null);

  const load = useCallback(() => {
    api("/api/admin").then(setData).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  const canEdit = data.canEdit;

  async function saveUser() {
    await api("/api/admin", { json: { action: "saveUser", ...editUser, baseSalary: ungroup(String(editUser.baseSalary ?? "")) } });
    setEditUser(null);
    load();
  }
  async function saveProduct() {
    await api("/api/admin", { json: { action: "saveProduct", ...editProduct, unitPrice: ungroup(String(editProduct.unitPrice ?? "")) } });
    setEditProduct(null);
    load();
  }

  return (
    <Screen me={me} wide>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <h4 className="m0 f1">Users &amp; products</h4>
          <Link href="/doctors" className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}>{tx("manage.doctorsDirectory", "Doctors directory")}</Link>
        </div>

        <div className="row">
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)", flex: 1 }}>{tx("manage.usersBaseSalariesVisible", "Users · base salaries visible to you and the accountant only")}</h6>
          {canEdit ? <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setEditUser({ name: "", phone: "", role: "rep", city: (data.cities ?? [])[0]?.id ?? "", baseSalary: "1,200,000", dailyMin: 5, password: "password" })}>＋ Add user</button> : null}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ fontSize: 13, minWidth: 560 }}>
            <thead><tr><th>{tx("manage.name", "Name")}</th><th>{tx("manage.role", "Role")}</th><th>{tx("manage.city", "City")}</th><th className="ta-r">{tx("manage.baseSalary", "Base salary")}</th><th className="ta-r">{tx("manage.dailyMin", "Daily min")}</th><th>{tx("manage.line", "Line")}</th><th></th></tr></thead>
            <tbody>
              {data.users.map((u: any) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td>{roleLabel(t, u.role)}</td>
                  <td>{u.city === "all" ? "All" : (data.cities ?? []).find((c: any) => c.id === u.city)?.name ?? u.city}</td>
                  <td className="ta-r">{u.baseSalary ? money(u.baseSalary) : "—"}</td>
                  <td className="ta-r">{u.dailyMin ? `${u.dailyMin} visits` : "—"}</td>
                  <td className="small muted">{u.productLine || "all"}</td>
                  <td className="ta-r">
                    <span className={`tag ${u.active ? "tag-accent" : "tag-neutral"}`}>{u.active ? "Active" : "Off"}</span>
                    {canEdit ? <button className="btn btn-ghost fs-caption" onClick={() => setEditUser({ ...u, baseSalary: groupDigits(String(u.baseSalary ?? "")) })}>{tx("manage.edit", "Edit")}</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editUser ? (
          <div className="card gap-3">
            <h6 className="m0">{editUser.id ? `Edit ${editUser.name}` : "New user"}</h6>
            <div className="two-col gap-3">
              <div className="field m0"><label>{tx("manage.name", "Name")}</label><input className="input" value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} /></div>
              <div className="field m0"><label>{tx("manage.phone", "Phone")}</label><input className="input" value={editUser.phone} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <div className="field m0"><label>{tx("manage.role", "Role")}</label>
                <select className="input" value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                  <option value="rep">Rep</option><option value="collector">{tx("manage.collector", "Collector")}</option><option value="supervisor">{tx("manage.supervisor", "Supervisor")}</option><option value="accountant">{tx("manage.accountant", "Accountant")}</option><option value="admin">{tx("manage.admin", "Admin")}</option>
                </select>
              </div>
              <div className="field m0"><label>{tx("manage.city", "City")}</label>
                <select className="input" value={editUser.city} onChange={(e) => setEditUser({ ...editUser, city: e.target.value })}>
                  {(data.cities ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="all">{tx("manage.allCities", "All cities")}</option>
                </select>
              </div>
              <div className="field m0"><label>{tx("manage.baseSalary", "Base salary")}</label><input className="input" inputMode="numeric" value={editUser.baseSalary} onChange={(e) => setEditUser({ ...editUser, baseSalary: groupDigits(e.target.value) })} /></div>
              <div className="field m0"><label>{tx("manage.dailyMin", "Daily min")}</label><input className="input" inputMode="numeric" value={editUser.dailyMin} onChange={(e) => setEditUser({ ...editUser, dailyMin: e.target.value.replace(/[^0-9]/g, "") })} /></div>
              <div className="field m0">
                <label>{tx("manage.productLine", "Product line")}</label>
                {/* Left blank the person sells everything, which is how every
                    existing user is set up and must stay. */}
                <select className="input" value={editUser.productLine ?? ""}
                  onChange={(e) => setEditUser({ ...editUser, productLine: e.target.value })}>
                  <option value="">{tx("manage.allProducts", "All products")}</option>
                  {(data.productLines ?? []).map((l: string) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="two-col gap-3">
              <div className="field m0"><label>Password {editUser.id ? "(leave blank to keep)" : ""}</label><input className="input" value={editUser.password ?? ""} onChange={(e) => setEditUser({ ...editUser, password: e.target.value })} /></div>
              <label className="radio" style={{ fontSize: 13, alignSelf: "end", paddingBottom: 8 }}>
                <input type="checkbox" checked={editUser.active ?? true} onChange={(e) => setEditUser({ ...editUser, active: e.target.checked })} />
                <span className="dot" />{tx("manage.active", "Active")}
              </label>
            </div>
            {editUser.role === "rep" ? (
              <label className="radio fs-small">
                <input type="checkbox" checked={editUser.canCollect !== false} onChange={(e) => setEditUser({ ...editUser, canCollect: e.target.checked })} />
                <span className="dot" />{tx("manage.canCollect", "Collects payments — off when a dedicated collector covers their customers")}
              </label>
            ) : null}
            <div className="two">
              <button className="btn btn-primary" style={{ padding: 9 }} onClick={saveUser}>{tx("manage.save", "Save")}</button>
              <button className="btn btn-secondary" style={{ padding: 9 }} onClick={() => setEditUser(null)}>{tx("manage.cancel", "Cancel")}</button>
            </div>
          </div>
        ) : null}

        {canEdit ? (
          <div className="card gap-3">
            <div className="row">
              <h6 className="m0 f1">{tx("manage.handATerritoryOver", "Hand a territory over")}</h6>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}
                onClick={() => { setHandover(handover ? null : { fromId: "", toId: "", deactivate: true }); setHoErr(""); }}>
                {handover ? "Cancel" : "Start handover"}
              </button>
            </div>
            <div className="small muted">
              Moves one person&apos;s city to another — the new person immediately sees those doctors. History stays with whoever did the work.
            </div>
            {handover ? (
              <>
                <div className="two-3">
                  <div className="field m0">
                    <label>{tx("manage.leavingAway", "Leaving / away")}</label>
                    <select className="input" value={handover.fromId} onChange={(e) => setHandover({ ...handover, fromId: e.target.value })}>
                      <option value="">{tx("manage.pickAPerson", "Pick a person")}</option>
                      {data.users.filter((u: any) => u.active && u.role === "rep").map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name} · {(data.cities ?? []).find((c: any) => c.id === u.city)?.name ?? u.city}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field m0">
                    <label>{tx("manage.takingOver", "Taking over")}</label>
                    <select className="input" value={handover.toId} onChange={(e) => setHandover({ ...handover, toId: e.target.value })}>
                      <option value="">{tx("manage.pickAPerson", "Pick a person")}</option>
                      {data.users.filter((u: any) => u.active && u.role === "rep" && String(u.id) !== handover.fromId).map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="radio fs-small">
                  <input type="checkbox" checked={handover.deactivate} onChange={(e) => setHandover({ ...handover, deactivate: e.target.checked })} />
                  <span className="dot" />{tx("manage.alsoSwitchTheLeaving", "Also switch the leaving person off")}
                </label>
                {hoErr ? <div className="tag tag-hot self-start">{hoErr}</div> : null}
                <button className="btn btn-primary" style={{ padding: 9 }}
                  onClick={async () => {
                    setHoErr("");
                    try {
                      const r = await api<any>("/api/admin", { json: { action: "handover", ...handover } });
                      if (r.needsConfirm) {
                        if (!window.confirm(`${r.message}

Continue anyway?`)) return;
                        await api("/api/admin", { json: { action: "handover", ...handover, acceptOrphan: true } });
                      }
                      setHandover(null);
                      load();
                    } catch (e: any) { setHoErr(e.message); }
                  }}>
                  {tx("manage.handOver", "Hand over")}
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="row" style={{ marginTop: 8 }}>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)", flex: 1 }}>Products &amp; prices</h6>
          {canEdit ? <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setEditProduct({ name: "", sku: "", unitPrice: "", unit: "box" })}>＋ Add product</button> : null}
        </div>
        {canEdit ? <div className="small muted">{tx("manage.dragToReorder", "Drag rows to set the order reps see products in — everywhere in the app.")}</div> : null}
        <table className="table fs-small">
          <thead><tr>{canEdit ? <th style={{ width: 26 }}></th> : null}<th>{tx("manage.product", "Product")}</th><th>SKU</th><th className="ta-r">{tx("manage.unitPrice", "Unit price")}</th><th></th></tr></thead>
          <tbody>
            {(prods ?? data.products).map((p: any) => (
              <tr key={p.id}
                draggable={canEdit}
                onDragStart={() => setDrag(p.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (drag == null || drag === p.id) return;
                  const list = (prods ?? data.products).slice();
                  const fromIdx = list.findIndex((x: any) => x.id === drag);
                  const toIdx = list.findIndex((x: any) => x.id === p.id);
                  list.splice(toIdx, 0, list.splice(fromIdx, 1)[0]);
                  setProds(list);
                }}
                onDrop={async () => {
                  if (drag != null && prods) {
                    await api("/api/admin", { json: { action: "reorderProducts", ids: prods.map((x: any) => x.id) } });
                    setProds(null);
                    load();
                  }
                  setDrag(null);
                }}
                onDragEnd={() => setDrag(null)}
                style={{ opacity: drag === p.id ? 0.4 : 1 }}>
                {canEdit ? <td style={{ cursor: "grab", color: "var(--color-neutral-400)", userSelect: "none" }} title="Drag to reorder">⠿</td> : null}
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td className="muted">{p.sku}</td>
                <td className="ta-r">
                  {money(p.unitPrice)} / {p.unit}
                  {p.line ? <div className="small muted">{p.line}</div> : null}
                  {p.tiers?.length ? <div className="small muted">{p.tiers.map((t: any) => `${t.minQty}+ → ${t.price.toLocaleString()}`).join(" · ")}</div> : null}
                </td>
                <td className="ta-r">
                  <span className={`tag ${p.active ? "tag-accent" : "tag-neutral"}`}>{p.active ? "Active" : "Off"}</span>
                  {canEdit ? <button className="btn btn-ghost fs-caption" onClick={() => setEditProduct({ ...p, unitPrice: groupDigits(String(p.unitPrice ?? "")) })}>{tx("manage.edit", "Edit")}</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {editProduct ? (
          <div className="card gap-3">
            <h6 className="m0">{editProduct.id ? `Edit ${editProduct.name}` : "New product"}</h6>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <div className="field m0"><label>{tx("manage.name", "Name")}</label><input className="input" value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} /></div>
              <div className="field m0"><label>SKU</label><input className="input" value={editProduct.sku} onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value })} /></div>
              <div className="field m0"><label>{tx("manage.priceIqd", "Price (IQD)")}</label><input className="input" inputMode="numeric" value={editProduct.unitPrice} onChange={(e) => setEditProduct({ ...editProduct, unitPrice: groupDigits(e.target.value) })} /></div>
              <div className="field m0"><label>{tx("manage.unit", "Unit")}</label><input className="input" value={editProduct.unit} onChange={(e) => setEditProduct({ ...editProduct, unit: e.target.value })} /></div>
              <div className="field m0">
                <label>{tx("manage.line", "Line")}</label>
                <select className="input" value={editProduct.line ?? ""}
                  onChange={(e) => setEditProduct({ ...editProduct, line: e.target.value })}>
                  <option value="">{tx("manage.everyoneSellsIt", "Everyone sells it")}</option>
                  {(data.productLines ?? []).map((l: string) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="stack-2">
              <div className="small muted">Quantity price tiers — buy more, pay less per {editProduct.unit || "box"}:</div>
              {(editProduct.tiers ?? []).map((t: any, i: number) => (
                <div key={i} className="row" style={{ gap: 8, fontSize: 13 }}>
                  <span className="muted">{tx("manage.from", "From")}</span>
                  <input className="input" style={{ width: 70, minHeight: 30 }} inputMode="numeric" value={t.minQty}
                    onChange={(e) => setEditProduct({ ...editProduct, tiers: editProduct.tiers.map((x: any, j: number) => (j === i ? { ...x, minQty: e.target.value } : x)) })} />
                  <span className="muted">pieces →</span>
                  <input className="input" style={{ width: 100, minHeight: 30 }} inputMode="numeric" value={t.price}
                    onChange={(e) => setEditProduct({ ...editProduct, tiers: editProduct.tiers.map((x: any, j: number) => (j === i ? { ...x, price: e.target.value } : x)) })} />
                  <span className="muted">IQD</span>
                  <button className="btn btn-ghost" style={{ fontSize: 12, marginLeft: "auto" }} onClick={() => setEditProduct({ ...editProduct, tiers: editProduct.tiers.filter((_: any, j: number) => j !== i) })}>✕</button>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px", alignSelf: "flex-start" }}
                onClick={() => setEditProduct({ ...editProduct, tiers: [...(editProduct.tiers ?? []), { minQty: 10, price: ungroup(String(editProduct.unitPrice ?? "")) }] })}>
                ＋ Add tier
              </button>
            </div>
            {editProduct.id ? (
              <label className="radio fs-small">
                <input type="checkbox" checked={editProduct.active} onChange={(e) => setEditProduct({ ...editProduct, active: e.target.checked })} />
                <span className="dot" />{tx("manage.active", "Active")}
              </label>
            ) : null}
            <div className="hint">Price changes never alter historical orders or incentives — quantities are valued at the snapshot taken when each order was placed.</div>
            <div className="two">
              <button className="btn btn-primary" style={{ padding: 9 }} onClick={saveProduct}>{tx("manage.save", "Save")}</button>
              <button className="btn btn-secondary" style={{ padding: 9 }} onClick={() => setEditProduct(null)}>{tx("manage.cancel", "Cancel")}</button>
            </div>
          </div>
        ) : null}
    </Screen>
  );
}
