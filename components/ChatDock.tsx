"use client";
import { compressImage } from "@/lib/image";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, paths } from "./Icons";
import { CallButton } from "./DoctorLink";
import { api, hm } from "@/lib/fmt";

// Messenger-style chat that floats bottom-right on the PC screens.
export function ChatDock() {
  const tx = useT();
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  const [channel, setChannel] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenTop = useRef<number>(0);
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [attachOn, setAttachOn] = useState(true);

  const load = useCallback((chan: string) => {
    api(`/api/messages${chan ? `?channel=${encodeURIComponent(chan)}` : ""}`).then((r: any) => {
      setChannels(r.channels ?? []);
      if (!chan && r.channel) { setChannel(r.channel); return; }
      setMessages(r.messages ?? []);
      const top = r.messages?.length ? Math.max(...r.messages.map((m: any) => m.id)) : 0;
      if (open) { seenTop.current = top; setUnread(0); }
      else if (seenTop.current) setUnread(r.messages.filter((m: any) => m.id > seenTop.current && !m.mine).length);
      else seenTop.current = top;
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    api("/api/settings").then((r: any) => setAttachOn(!!r.settings.chatAttachments)).catch(() => {});
  }, []);

  useEffect(() => {
    load(channel);
    const t = setInterval(() => load(channel), 5000);
    return () => clearInterval(t);
  }, [channel, load]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  async function send() {
    const body = text.trim();
    if (!body || !channel) return;
    setText("");
    try {
      const r = await api("/api/messages", { json: { channel, body } });
      setMessages((prev) => [...prev, r.message]);
      seenTop.current = Math.max(seenTop.current, r.message.id);
    } catch {}
  }

  async function uploadAndSend(file: File | Blob, kind: "image" | "file" | "voice", name: string, duration?: number) {
    if (!channel) return;
    // Chat photos shrink like every other photo; voice notes and files pass
    // through untouched. See lib/image.ts.
    const toSend = kind === "image"
      ? await compressImage(new File([file], name, { type: (file as File).type || "image/jpeg" }))
      : new File([file], name, { type: (file as File).type || "application/octet-stream" });
    const fd = new FormData();
    fd.append("file", toSend);
    try {
      const up = await fetch("/api/files", { method: "POST", body: fd }).then((x) => x.json());
      if (!up.id) return;
      const r = await api("/api/messages", {
        json: { channel, kind, fileId: up.id, fileName: name, duration: duration ?? null, body: "" },
      });
      setMessages((prev) => [...prev, r.message]);
      seenTop.current = Math.max(seenTop.current, r.message.id);
    } catch {}
  }

  async function toggleRecord() {
    if (recording) { recorder?.stop(); return; }
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
        uploadAndSend(new Blob(chunks, { type: mime }), "voice",
          `voice-${Date.now()}.${mime.includes("webm") ? "webm" : "m4a"}`, secs);
      };
      rec.start();
      setRecorder(rec);
      setRecording(true);
    } catch {
      alert("Microphone not available — check permissions.");
    }
  }

  const current: any = channels.find((c) => c.id === channel);

  return (
    <div className="chatdock no-print">
      {open ? (
        <div className="chatdock-panel">
          <div className="chatdock-head">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, flex: 1 }}>
              {current?.label ?? "Chat"}
            </span>
            {current?.phone ? <CallButton phone={current.phone} name={current.label} size={26} /> : null}
            <Link href="/chat" title={tx("dock.openFullChatPh", "Open full chat")} aria-label={tx("dock.openFullChatPh", "Open full chat")}
              style={{ color: "var(--c-violet-deep)", display: "grid", placeItems: "center", width: 36, height: 36 }}>
              <Icon d="M15 3h6v6 M10 14 21 3 M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" size={15} />
            </Link>
            <button onClick={() => setOpen(false)} aria-label={tx("dock.closeChatPh", "Close chat")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: "var(--c-violet-deep)" }}>✕</button>
          </div>

          <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}
            style={{ margin: "8px 10px 0", width: "calc(100% - 20px)", minHeight: 30, fontSize: 12 }}>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          {/* Same tap-to-dismiss as the phone chat: the dock is desktop-first
              but the accountant uses it on a tablet too. */}
          <div className="chatdock-body"
            onPointerDown={() => {
              const el = document.activeElement;
              if (el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) el.blur();
            }}>
            {messages.map((m) => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: m.mine ? "flex-end" : "flex-start" }}>
                <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>
                  {m.mine ? hm(m.ts) : `${m.senderName} · ${hm(m.ts)}`}
                </span>
                {m.kind === "image" && m.fileId ? (
                  <a href={`/api/files?id=${m.fileId}`} target="_blank">
                    <img src={`/api/files?id=${m.fileId}`} alt="" style={{ maxWidth: 160, borderRadius: 10, display: "block" }} />
                  </a>
                ) : m.kind === "voice" && m.fileId ? (
                  <audio controls src={`/api/files?id=${m.fileId}`} style={{ height: 32, maxWidth: 190 }} />
                ) : m.kind === "file" && m.fileId ? (
                  <a href={`/api/files?id=${m.fileId}`} target="_blank" className="small">{m.fileName ?? "file"}</a>
                ) : (
                  <div className={m.mine ? "bubble-out" : "bubble-in"}
                    style={{ fontSize: 12, padding: "6px 10px", background: m.mine ? "var(--c-violet)" : undefined }}>
                    {m.body}
                  </div>
                )}
              </div>
            ))}
            {messages.length === 0 ? <div className="small muted">{tx("dock.noMessagesYet", "No messages yet.")}</div> : null}
            <div ref={bottomRef} />
          </div>

          {recording ? (
            <div className="row" style={{ gap: 8, margin: "0 10px", padding: "6px 10px", borderRadius: 999, background: "var(--c-coral-soft)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--c-coral)", flex: "none" }} />
              <span style={{ flex: 1, fontSize: 12, color: "var(--c-coral-deep)" }}>{tx("dock.recordingTapTheMic", "Recording… tap the mic to send")}</span>
            </div>
          ) : null}
          <div className="chatdock-foot">
            <input ref={imgRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSend(f, "image", f.name); e.target.value = ""; }} />
            <input ref={fileRef} type="file" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSend(f, "file", f.name); e.target.value = ""; }} />
            {attachOn ? (
              <>
                <button className="btn btn-secondary btn-icon" style={{ flex: "none", }}
                  onClick={() => imgRef.current?.click()} aria-label={tx("dock.sendAPicturePh", "Send a picture")} title="Picture">
                  <Icon d="M21 15l-5-5L5 21M3 5h18v14H3Z" size={17} />
                </button>
                <button className="btn btn-secondary btn-icon" style={{ flex: "none", }}
                  onClick={() => fileRef.current?.click()} aria-label={tx("dock.sendAFilePh", "Send a file")} title="File">
                  <Icon d="M21 12.5 12.5 21a4.95 4.95 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 19" size={17} />
                </button>
              </>
            ) : null}
            <input className="input" placeholder={tx("dock.messagePh", "Message…")} value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              style={{ minHeight: 32, fontSize: 12 }} />
            {text.trim() || !attachOn ? (
              <button className="btn btn-icon" onClick={send} aria-label={tx("dock.sendPh", "Send")}
                style={{ flex: "none", background: "var(--c-violet)", border: "none" }}>
                <Icon d={paths.send} size={17} stroke="#fff" />
              </button>
            ) : (
              <button className="btn btn-icon" onClick={toggleRecord} aria-label={tx("dock.voiceMessagePh", "Voice message")} title={tx("dock.holdAVoiceNotePh", "Hold a voice note")}
                style={{ flex: "none", background: recording ? "var(--c-coral)" : "var(--c-violet)", border: "none" }}>
                <Icon d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3" size={17} stroke="#fff" />
              </button>
            )}
          </div>
        </div>
      ) : null}

      <button className="chatdock-bubble" onClick={() => { setOpen(true); setUnread(0); }} aria-label={tx("dock.openChatPh", "Open chat")}>
        <Icon d={paths.chat} size={24} stroke="#fff" />
        {unread > 0 ? <span className="chat-badge" style={{ top: 2, right: 2 }}>{unread}</span> : null}
      </button>
    </div>
  );
}
