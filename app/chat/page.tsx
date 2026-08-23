"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, hm } from "@/lib/fmt";
import { Icon, paths } from "@/components/Icons";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

function ChatInner() {
  const me = useMe();
  const params = useSearchParams();
  const wanted = params.get("channel") ?? "";
  const [channel, setChannel] = useState(wanted);
  const [channels, setChannels] = useState<{ id: string; label: string }[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastId = useRef(0);

  const load = useCallback((chan: string, reset: boolean) => {
    const after = reset ? 0 : lastId.current;
    api(`/api/messages${chan ? `?channel=${encodeURIComponent(chan)}&after=${after}` : ""}`).then((r: any) => {
      setChannels(r.channels);
      // Only auto-pick a channel when none was requested.
      if (!chan && r.channel) { setChannel(r.channel); return; }
      setMessages((prev) => {
        const next = reset ? r.messages : [...prev, ...r.messages.filter((m: any) => !prev.some((p) => p.id === m.id))];
        if (next.length) lastId.current = Math.max(...next.map((m: any) => m.id));
        return next;
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (wanted) setChannel(wanted);
  }, [wanted]);

  useEffect(() => {
    lastId.current = 0;
    setMessages([]);
    load(channel, true);
    const t = setInterval(() => load(channel, false), 4000);
    return () => clearInterval(t);
  }, [channel, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!me) return <Spinner />;

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    try {
      const r = await api("/api/messages", { json: { channel, body } });
      setMessages((prev) => [...prev, r.message]);
      lastId.current = Math.max(lastId.current, r.message.id);
    } catch {}
  }

  async function uploadAndSend(file: File | Blob, kind: "image" | "file" | "voice", name: string, duration?: number) {
    const fd = new FormData();
    fd.append("file", new File([file], name, { type: (file as File).type || "application/octet-stream" }));
    try {
      const up = await fetch("/api/files", { method: "POST", body: fd }).then((x) => x.json());
      if (!up.id) return;
      const r = await api("/api/messages", { json: { channel, kind, fileId: up.id, fileName: name, duration: duration ?? null, body: "" } });
      setMessages((prev) => [...prev, r.message]);
      lastId.current = Math.max(lastId.current, r.message.id);
    } catch {}
  }

  async function toggleRecord() {
    if (recording) {
      recorder?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      const started = Date.now();
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setRecorder(null);
        const secs = Math.round((Date.now() - started) / 1000);
        if (secs < 1) return;
        const blob = new Blob(chunks, { type: mime });
        uploadAndSend(blob, "voice", `voice-${Date.now()}.${mime.includes("webm") ? "webm" : "m4a"}`, secs);
      };
      rec.start();
      setRecorder(rec);
      setRecording(true);
    } catch {
      alert("Microphone not available — check permissions.");
    }
  }

  const mainChans = channels.filter((c) => !c.id.startsWith("dm-"));
  const dms = channels.filter((c) => c.id.startsWith("dm-"));

  return (
    <Screen me={me}>
      <div className="row" style={{ gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: "44% 44% 46% 46%/48% 48% 42% 42%", background: "var(--c-violet)", display: "grid", placeItems: "center", flex: "none" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="hnum" style={{ fontSize: 22, lineHeight: 1.05 }}>Chat</div>
          <div className="small muted">{channels.find((c) => c.id === channel)?.label ?? ""}</div>
        </div>
        {(() => {
          const c: any = channels.find((x) => x.id === channel);
          return c?.phone ? <CallButton phone={c.phone} name={c.label} size={34} /> : null;
        })()}
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {mainChans.map((c) => (
          <button key={c.id} className={`tag ${channel === c.id ? "tag-chat" : "tag-neutral"}`} style={{ border: "none", cursor: "pointer", fontSize: 12, padding: "4px 12px", flex: "none" }} onClick={() => setChannel(c.id)}>
            {c.label}
          </button>
        ))}
        {dms.length ? (
          <select
            className="tag tag-neutral"
            style={{ border: "none", cursor: "pointer", fontSize: 12, flex: "none", maxWidth: 110 }}
            value={channel.startsWith("dm-") ? channel : ""}
            onChange={(e) => e.target.value && setChannel(e.target.value)}
          >
            <option value="">Direct…</option>
            {dms.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        ) : null}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: m.mine ? "flex-end" : "flex-start" }}>
            <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>
              {m.mine ? hm(m.ts) : `${m.senderName} · ${hm(m.ts)}`}
            </span>
            {m.kind === "image" && m.fileId ? (
              <a href={`/api/files?id=${m.fileId}`} target="_blank" className={m.mine ? "bubble-out" : "bubble-in"} style={{ padding: 4, background: m.mine ? "var(--c-violet)" : undefined }}>
                <img src={`/api/files?id=${m.fileId}`} alt={m.fileName ?? "image"} style={{ maxWidth: 200, maxHeight: 200, borderRadius: 12, display: "block" }} />
              </a>
            ) : m.kind === "voice" && m.fileId ? (
              <div className={m.mine ? "bubble-out" : "bubble-in"} style={{ padding: "6px 10px", background: m.mine ? "var(--c-violet)" : undefined }}>
                <audio controls src={`/api/files?id=${m.fileId}`} style={{ height: 36, maxWidth: 210 }} />
                {m.duration ? <div style={{ fontSize: 12, opacity: 0.8 }}>{Math.floor(m.duration / 60)}:{String(m.duration % 60).padStart(2, "0")}</div> : null}
              </div>
            ) : m.kind === "file" && m.fileId ? (
              <a href={`/api/files?id=${m.fileId}`} target="_blank" className={m.mine ? "bubble-out" : "bubble-in"} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", background: m.mine ? "var(--c-violet)" : undefined, color: m.mine ? "#fff" : "inherit" }}>
                <Icon d={paths.file} size={15} />
                <span style={{ fontSize: 13 }}>{m.fileName ?? "file"}</span>
              </a>
            ) : (
              <div className={m.mine ? "bubble-out" : "bubble-in"} style={m.mine ? { background: "var(--c-violet)" } : undefined}>{m.body}</div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {recording ? (
        <div className="row" style={{ gap: 9, padding: "8px 12px", borderRadius: 999, background: "var(--c-coral-soft)" }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--c-coral)", flex: "none" }} />
          <span style={{ flex: 1, fontSize: 12, color: "var(--c-coral-deep)" }}>Recording… tap the mic again to send</span>
        </div>
      ) : null}
      <div className="row" style={{ gap: 7 }}>
        <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSend(f, "image", f.name); e.target.value = ""; }} />
        <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSend(f, "file", f.name); e.target.value = ""; }} />
        <button className="btn btn-secondary btn-icon" style={{ flex: "none", }} onClick={() => imgRef.current?.click()} aria-label="Send image">
          <Icon d="M21 15l-5-5L5 21M3 5h18v14H3Z" size={15} />
        </button>
        <button className="btn btn-secondary btn-icon" style={{ flex: "none", }} onClick={() => fileRef.current?.click()} aria-label="Send file">
          <Icon d="M21 12.5 12.5 21a4.95 4.95 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 19" size={15} />
        </button>
        <input
          className="input"
          placeholder="Message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          style={{ minHeight: 38, fontSize: 13 }}
        />
        {text.trim() ? (
          <button className="btn btn-icon" style={{ flex: "none", background: "var(--c-violet)", border: "1px solid var(--c-violet)" }} onClick={send} aria-label="Send">
            <Icon d={paths.send} size={15} stroke="#fff" />
          </button>
        ) : (
          <button className="btn btn-icon" style={{ flex: "none", background: recording ? "var(--c-coral)" : "var(--c-violet)", border: "none" }} onClick={toggleRecord} aria-label="Voice message">
            <Icon d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3" size={15} stroke="#fff" />
          </button>
        )}
      </div>
      <div className="hint" style={{ textAlign: "center" }}>Empty field shows the mic — tap to record, tap again to send. Type and the same button becomes send.</div>
    </Screen>
  );
}

export default function Chat() {
  return (
    <Suspense fallback={<Spinner />}>
      <ChatInner />
    </Suspense>
  );
}
