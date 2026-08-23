"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { Icon, paths } from "@/components/Icons";
import { api, dmy, money } from "@/lib/fmt";

// The rep's product catalog: photo, price tiers, and a brochure to show a doctor.
export default function Catalog() {
  const tx = useT();
  const me = useMe();
  const [products, setProducts] = useState<any[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [busyFor, setBusyFor] = useState<number | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<{ id: number; kind: "image" | "brochure" } | null>(null);
  const [brochures, setBrochures] = useState<any[]>([]);
  const libRef = useRef<HTMLInputElement>(null);
  const [libBusy, setLibBusy] = useState(false);

  const load = useCallback(() => {
    api("/api/targets").then((r: any) => setProducts(r.products)).catch(() => {});
    api("/api/brochures").then((r: any) => setBrochures(r.brochures ?? [])).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (!me || !products) return <Spinner />;
  const isAdmin = me.role === "admin";

  async function upload(file: File) {
    if (!target) return;
    setBusyFor(target.id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/files", { method: "POST", body: fd }).then((x) => x.json());
      if (!up.id) return;
      await api("/api/admin", {
        json: target.kind === "image"
          ? { action: "saveProduct", id: target.id, imageId: up.id }
          : { action: "saveProduct", id: target.id, brochureId: up.id, brochureName: file.name },
      });
      load();
    } finally {
      setBusyFor(null);
      setTarget(null);
    }
  }

  async function uploadToLibrary(file: File) {
    setLibBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/files", { method: "POST", body: fd }).then((x) => x.json());
      if (!up.id) return;
      const title = window.prompt("Name this brochure:", file.name.replace(/\.[^.]+$/, "")) ?? file.name;
      await api("/api/brochures", { json: { fileId: up.id, fileName: file.name, mime: file.type, title } });
      load();
    } finally { setLibBusy(false); }
  }

  return (
    <Screen me={me} wide>
      <div className="row">
        <h4 className="m0 f1">{tx("cat.products", "Products")}</h4>
        {isAdmin ? <span className="hint">{tx("cat.youCanAddA", "You can add a photo and a brochure to each product")}</span> : null}
      </div>
      <input ref={imgRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      <input ref={docRef} type="file" accept=".pdf,image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />

      <div className="two-col" style={{ gap: 12 }}>
        {products.map((p: any) => (
          <div key={p.id} className="card gap-3">
            <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
              {p.imageId ? (
                <a href={`/api/files?id=${p.imageId}`} target="_blank" style={{ flex: "none" }}>
                  <img src={`/api/files?id=${p.imageId}`} alt={p.name}
                    style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 12, display: "block" }} />
                </a>
              ) : (
                <div style={{ width: 76, height: 76, borderRadius: 12, background: "var(--color-neutral-200)", display: "grid", placeItems: "center", flex: "none" }}>
                  <Icon d={paths.box} size={24} stroke="var(--color-neutral-500)" />
                </div>
              )}
              <div className="f1min">
                <div style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</div>
                <div className="small muted">{p.sku} · per {p.unit}</div>
                <div className="hnum" style={{ fontSize: 18, marginTop: 2 }}>{money(p.unitPrice)}</div>
                {p.tiers?.length ? (
                  <div className="small" style={{ color: "var(--color-accent-700)" }}>
                    {p.tiers.map((t: any) => `${t.minQty}+ → ${t.price.toLocaleString()}`).join(" · ")}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {p.brochureId ? (
                <a className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }} href={`/api/files?id=${p.brochureId}`} target="_blank">
                  <Icon d={paths.file} size={13} /> {p.brochureName ?? "Brochure"}
                </a>
              ) : <span className="small muted">{tx("cat.noBrochureYet", "No brochure yet")}</span>}
              {isAdmin ? (
                <>
                  <button className="btn btn-ghost fs-caption" disabled={busyFor === p.id}
                    onClick={() => { setTarget({ id: p.id, kind: "image" }); setTimeout(() => imgRef.current?.click(), 0); }}>
                    {p.imageId ? "Replace photo" : "Add photo"}
                  </button>
                  <button className="btn btn-ghost fs-caption" disabled={busyFor === p.id}
                    onClick={() => { setTarget({ id: p.id, kind: "brochure" }); setTimeout(() => docRef.current?.click(), 0); }}>
                    {p.brochureId ? "Replace brochure" : "Add brochure"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <h4 className="m0 f1">Brochures &amp; price lists</h4>
        {isAdmin ? (
          <>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} disabled={libBusy}
              onClick={() => libRef.current?.click()}>
              {libBusy ? "Uploading…" : "＋ Upload"}
            </button>
            <input ref={libRef} type="file" accept=".pdf,image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadToLibrary(f); e.target.value = ""; }} />
          </>
        ) : null}
      </div>
      <div className="small muted">
        Material that is not tied to one product — price lists, campaign sheets, certificates.
      </div>
      {brochures.length === 0 ? (
        <div className="card muted">{tx("cat.nothingUploadedYet", "Nothing uploaded yet.")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {brochures.map((b: any) => (
            <div key={b.id} className="listrow">
              <Icon d={paths.file} size={16} stroke="var(--color-accent)" />
              <div className="f1min">
                <a href={`/api/files?id=${b.fileId}`} target="_blank" className="fs-small w-500">{b.title}</a>
                <div className="small muted">{b.fileName} · {b.byName} · {dmy(b.ts)}</div>
              </div>
              {isAdmin ? (
                <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--c-coral-deep)" }}
                  onClick={async () => {
                    if (!window.confirm(`Remove "${b.title}" from the library?`)) return;
                    await api("/api/brochures", { json: { action: "delete", id: b.id } });
                    load();
                  }}>
                  {tx("cat.remove", "Remove")}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="hint mt-auto">
        {tx("cat.openAPhotoOr", "Open a photo or brochure to show a doctor, or share it from the chat.")}
      </div>
    </Screen>
  );
}
