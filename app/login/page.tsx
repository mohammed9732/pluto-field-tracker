"use client";
import { Mascot } from "@/components/Mascot";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fmt";
import { Icon, paths } from "@/components/Icons";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [brand, setBrand] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/brand").then((r) => r.json()).then(setBrand).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ user: { role: string } }>("/api/auth/login", { json: { phone, password } });
      const role = r.user.role;
      router.replace(role === "accountant" ? "/acct/queue" : role === "admin" ? "/admin" : role === "supervisor" ? "/approvals" : "/home");
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="screen" style={{ position: "relative", overflow: "hidden" }}>
      <div className="aurora" aria-hidden="true" />
      <div className="screen-pad" style={{ paddingBottom: 20, position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 12 }}>
            {brand?.hasLogo ? (
              <img src="/api/logo" alt={brand?.companyName ?? "Logo"}
                style={{ maxWidth: 160, maxHeight: 82, objectFit: "contain", display: "block" }} />
            ) : null}
            <div style={{ textAlign: "center" }}>
              <div className="hnum" style={{ fontSize: 26, lineHeight: 1.05 }}>
                {(brand?.companyName ?? "Pluto Field Tracker").toUpperCase()}
              </div>
              {brand?.companySub ? (
                <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--color-neutral-600)" }}>
                  {brand.companySub}
                </div>
              ) : null}
            </div>
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field">
              <label>Phone number or name</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+964 750 123 4567" autoFocus />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {err ? <div className="tag tag-hot" style={{ alignSelf: "flex-start" }}>{err}</div> : null}
            <button className="btn btn-primary btn-block" style={{ padding: 12 }} disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          {brand?.demo ? (
            <div className="hint" style={{ textAlign: "center" }}>
              Demo sign-ins (password: <b>password</b>): Mo · Dr. Alan · Sami Kareem · Dara Mustafa · Aland Talabani · Zhilan Omar
            </div>
          ) : null}
        </div>
        {brand?.loginFooter ? (
          <div className="hint" style={{ textAlign: "center" }}>{brand.loginFooter}</div>
        ) : null}
      </div>
    </div>
  );
}
