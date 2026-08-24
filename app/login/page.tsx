"use client";
import { Mascot } from "@/components/Mascot";
import { initLang, useT } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fmt";
import { Icon, paths } from "@/components/Icons";

export default function Login() {
  const tx = useT();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [brand, setBrand] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Before anything else: whatever this device chose last time.
    initLang();
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
      <div className="login-greeter" aria-hidden="true">
        <span className="login-bubble">{tx("login.hello", "Hello")}</span>
        <Mascot size={88} mood="hello" />
      </div>
      <div className="screen-pad" style={{ paddingBottom: 20, position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 12 }}>
            {brand?.hasLogo ? (
              <img src="/api/logo" alt={brand?.companyName ?? "Logo"}
                style={{ maxWidth: 160, maxHeight: 82, objectFit: "contain", display: "block" }} />
            ) : null}
            <div style={{ textAlign: "center" }}>
              <div className="hnum" style={{ fontSize: 28, lineHeight: 1.05 }}>
                {(brand?.companyName ?? "Pluto Field Tracker").toUpperCase()}
              </div>
              {brand?.companySub ? (
                <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--color-neutral-600)" }}>
                  {brand.companySub}
                </div>
              ) : null}
            </div>
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field">
              <label>{tx("login.phoneNumberOrName", "Phone number or name")}</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+964 750 123 4567" autoFocus />
            </div>
            <div className="field">
              <label>{tx("login.password", "Password")}</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {err ? <div className="tag tag-hot self-start">{err}</div> : null}
            <button className="btn btn-primary btn-block" style={{ padding: 12 }} disabled={busy}>
              {busy ? tx("login.signingIn", "Signing in…") : tx("login.signIn", "Sign in")}
            </button>
          </form>
          {brand?.demo ? (
            <div className="hint" style={{ textAlign: "center" }}>
              {tx("login.demoSignInsPassword", "Demo sign-ins (password:")} <b>password</b>): Mo · Dr. Alan · Sami Kareem · Dara Mustafa · Aland Talabani · Zhilan Omar
            </div>
          ) : null}
        </div>
        {/* The language switch belongs here, not buried in a menu behind the
            sign-in. Somebody who reads Arabic should be able to put the app
            into Arabic before they type anything. */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <LangToggle />
        </div>
        {brand?.loginFooter ? (
          <div className="hint" style={{ textAlign: "center", marginTop: 10 }}>{brand.loginFooter}</div>
        ) : null}
      </div>
    </div>
  );
}
