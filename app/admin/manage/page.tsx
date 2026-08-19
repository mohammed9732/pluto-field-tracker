"use client";
import { useTerms, roleLabel } from "@/lib/terms";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, money } from "@/lib/fmt";

export default function Manage() {
  const me = useMe();
  const t = useTerms();
  const [data, setData] = useState<any>(null);
  const [editUser, setEditUser] = useState<any>(null);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [handover, setHandover] = useState<{ fromId: string; toId: string; deactivate: boolean } | null>(null);
  const [hoErr, setHoErr] = useState("");

  const load = useCallback(() => {
    api("/api/admin").then(setData).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !data) return <Spinner />;
  const canEdit = data.canEdit;

  async function saveUser() {
    await api("/api/admin", { json: { action: "saveUser", ...editUser } });
    setEditUser(null);
    load();
  }
  async function saveProduct() {
    await api("/api/admin", { json: { action: "saveProduct", ...editProduct } });
    setEditProduct(null);
    load();
  }

  return (
    <Screen me={me} wide>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <h4 style={{ margin: 0, flex: 1 }}>Users &amp; products</h4>
          <Link href="/doctors" className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}>Doctors directory</Link>
        </div>

        <div className="row">
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)", flex: 1 }}>Users · base salaries visible to you and the accountant only</h6>
          {canEdit ? <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setEditUser({ name: "", phone: "", role: "rep", city: (data.cities ?? [])[0]?.id ?? "", baseSalary: 1200000, dailyMin: 5, password: "password" })}>＋ Add user</button> : null}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ fontSize: 13, minWidth: 560 }}>
            <thead><tr><th>Name</th><th>Role</th><th>City</th><th style={{ textAlign: "right" }}>Base salary</th><th style={{ textAlign: "right" }}>Daily min</th><th></th></tr></thead>
            <tbody>
              {data.users.map((u: any) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td>{roleLabel(t, u.role)}</td>
                  <td>{u.city === "all" ? "All" : (data.cities ?? []).find((c: any) => c.id === u.city)?.name ?? u.city}</td>
                  <td style={{ textAlign: "right" }}>{u.baseSalary ? money(u.baseSalary) : "—"}</td>
                  <td style={{ textAlign: "right" }}>{u.dailyMin ? `${u.dailyMin} visits` : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`tag ${u.active ? "tag-accent" : "tag-neutral"}`}>{u.active ? "Active" : "Off"}</span>
                    {canEdit ? <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditUser({ ...u })}>Edit</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editUser ? (
          <div className="card" style={{ gap: 10 }}>
            <h6 style={{ margin: 0 }}>{editUser.id ? `Edit ${editUser.name}` : "New user"}</h6>
            <div className="two-col" style={{ gap: 10 }}>
              <div className="field" style={{ margin: 0 }}><label>Name</label><input className="input" value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} /></div>
              <div className="field" style={{ margin: 0 }}><label>Phone</label><input className="input" value={editUser.phone} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <div className="field" style={{ margin: 0 }}><label>Role</label>
                <select className="input" value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                  <option value="rep">Rep</option><option value="supervisor">Supervisor</option><option value="accountant">Accountant</option><option value="admin">Admin</option>
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}><label>City</label>
                <select className="input" value={editUser.city} onChange={(e) => setEditUser({ ...editUser, city: e.target.value })}>
                  {(data.cities ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="all">All cities</option>
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}><label>Base salary</label><input className="input" inputMode="numeric" value={editUser.baseSalary} onChange={(e) => setEditUser({ ...editUser, baseSalary: e.target.value })} /></div>
              <div className="field" style={{ margin: 0 }}><label>Daily min</label><input className="input" inputMode="numeric" value={editUser.dailyMin} onChange={(e) => setEditUser({ ...editUser, dailyMin: e.target.value })} /></div>
            </div>
            <div className="two-col" style={{ gap: 10 }}>
              <div className="field" style={{ margin: 0 }}><label>Password {editUser.id ? "(leave blank to keep)" : ""}</label><input className="input" value={editUser.password ?? ""} onChange={(e) => setEditUser({ ...editUser, password: e.target.value })} /></div>
              <label className="radio" style={{ fontSize: 13, alignSelf: "end", paddingBottom: 8 }}>
                <input type="checkbox" checked={editUser.active ?? true} onChange={(e) => setEditUser({ ...editUser, active: e.target.checked })} />
                <span className="dot" />Active
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="btn btn-primary" style={{ padding: 9 }} onClick={saveUser}>Save</button>
              <button className="btn btn-secondary" style={{ padding: 9 }} onClick={() => setEditUser(null)}>Cancel</button>
            </div>
          </div>
        ) : null}

        {canEdit ? (
          <div className="card" style={{ gap: 10 }}>
            <div className="row">
              <h6 style={{ margin: 0, flex: 1 }}>Hand a territory over</h6>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Leaving / away</label>
                    <select className="input" value={handover.fromId} onChange={(e) => setHandover({ ...handover, fromId: e.target.value })}>
                      <option value="">Pick a person</option>
                      {data.users.filter((u: any) => u.active && u.role === "rep").map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name} · {(data.cities ?? []).find((c: any) => c.id === u.city)?.name ?? u.city}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Taking over</label>
                    <select className="input" value={handover.toId} onChange={(e) => setHandover({ ...handover, toId: e.target.value })}>
                      <option value="">Pick a person</option>
                      {data.users.filter((u: any) => u.active && u.role === "rep" && String(u.id) !== handover.fromId).map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="radio" style={{ fontSize: 13 }}>
                  <input type="checkbox" checked={handover.deactivate} onChange={(e) => setHandover({ ...handover, deactivate: e.target.checked })} />
                  <span className="dot" />Also switch the leaving person off
                </label>
                {hoErr ? <div className="tag tag-hot" style={{ alignSelf: "flex-start" }}>{hoErr}</div> : null}
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
                  Hand over
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="row" style={{ marginTop: 8 }}>
          <h6 style={{ margin: 0, color: "var(--color-neutral-600)", flex: 1 }}>Products &amp; prices</h6>
          {canEdit ? <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setEditProduct({ name: "", sku: "", unitPrice: 0, unit: "box" })}>＋ Add product</button> : null}
        </div>
        <table className="table" style={{ fontSize: 13 }}>
          <thead><tr><th>Product</th><th>SKU</th><th style={{ textAlign: "right" }}>Unit price</th><th></th></tr></thead>
          <tbody>
            {data.products.map((p: any) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td className="muted">{p.sku}</td>
                <td style={{ textAlign: "right" }}>
                  {money(p.unitPrice)} / {p.unit}
                  {p.tiers?.length ? <div className="small muted">{p.tiers.map((t: any) => `${t.minQty}+ → ${t.price.toLocaleString()}`).join(" · ")}</div> : null}
                </td>
                <td style={{ textAlign: "right" }}>
                  <span className={`tag ${p.active ? "tag-accent" : "tag-neutral"}`}>{p.active ? "Active" : "Off"}</span>
                  {canEdit ? <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditProduct({ ...p })}>Edit</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {editProduct ? (
          <div className="card" style={{ gap: 10 }}>
            <h6 style={{ margin: 0 }}>{editProduct.id ? `Edit ${editProduct.name}` : "New product"}</h6>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
              <div className="field" style={{ margin: 0 }}><label>Name</label><input className="input" value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} /></div>
              <div className="field" style={{ margin: 0 }}><label>SKU</label><input className="input" value={editProduct.sku} onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value })} /></div>
              <div className="field" style={{ margin: 0 }}><label>Price (IQD)</label><input className="input" inputMode="numeric" value={editProduct.unitPrice} onChange={(e) => setEditProduct({ ...editProduct, unitPrice: e.target.value })} /></div>
              <div className="field" style={{ margin: 0 }}><label>Unit</label><input className="input" value={editProduct.unit} onChange={(e) => setEditProduct({ ...editProduct, unit: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="small muted">Quantity price tiers — buy more, pay less per {editProduct.unit || "box"}:</div>
              {(editProduct.tiers ?? []).map((t: any, i: number) => (
                <div key={i} className="row" style={{ gap: 8, fontSize: 13 }}>
                  <span className="muted">From</span>
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
                onClick={() => setEditProduct({ ...editProduct, tiers: [...(editProduct.tiers ?? []), { minQty: 10, price: editProduct.unitPrice }] })}>
                ＋ Add tier
              </button>
            </div>
            {editProduct.id ? (
              <label className="radio" style={{ fontSize: 13 }}>
                <input type="checkbox" checked={editProduct.active} onChange={(e) => setEditProduct({ ...editProduct, active: e.target.checked })} />
                <span className="dot" />Active
              </label>
            ) : null}
            <div className="hint">Price changes never alter historical orders or incentives — quantities are valued at the snapshot taken when each order was placed.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="btn btn-primary" style={{ padding: 9 }} onClick={saveProduct}>Save</button>
              <button className="btn btn-secondary" style={{ padding: 9 }} onClick={() => setEditProduct(null)}>Cancel</button>
            </div>
          </div>
        ) : null}
    </Screen>
  );
}
