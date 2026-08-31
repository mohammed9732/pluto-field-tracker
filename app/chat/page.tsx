"use client";
import { openImage } from "@/components/Lightbox";
import { compressImage } from "@/lib/image";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { useSearchParams } from "next/navigation";
import { Screen, useMe, Spinner } from "@/components/Shell";
import { api, hm } from "@/lib/fmt";
import { Icon, paths } from "@/components/Icons";
import { DoctorLink, CallButton } from "@/components/DoctorLink";

function ChatInner() {
  const tx = useT();
  const me = useMe();
  const params = useSearchParams();
  const wanted = params.get("channel") ?? "";
  const [channel, setChannel] = useState(wanted);
  const [channels, setChannels] = useState<{ id: string; label: string }[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [reactions, setReactions] = useState<Record<number, { emoji: string; userId: number; name: string }[]>>({});
  const [actionsFor, setActionsFor] = useState<any | null>(null); // long-pressed message
  const [replyTo, setReplyTo] = useState<any | null>(null);       // quoted draft
  const [meetRoom, setMeetRoom] = useState<string | null>(null);  // open video overlay
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      // Reactions arrive as a full map every poll — they land on OLD
      // messages, which the incremental stream would never re-send.
      setReactions((prev) => (reset ? r.reactions ?? {} : { ...prev, ...(r.reactions ?? {}) }));
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
    const quoted = replyTo;
    setReplyTo(null);
    try {
      const r = await api("/api/messages", { json: { channel, body, replyToId: quoted?.id ?? null } });
      setMessages((prev) => [...prev, r.message]);
      lastId.current = Math.max(lastId.current, r.message.id);
    } catch {}
  }

  async function react(m: any, emoji: string) {
    setActionsFor(null);
    try {
      await api("/api/messages", { json: { action: "react", id: m.id, emoji } });
      load(channel, false);
    } catch {}
  }

  // The DM channel with a given colleague — if policy allows one.
  function dmIdFor(senderId: number): string | null {
    if (!me || senderId === me.id) return null;
    const pair = [me.id, senderId].sort((a, b) => a - b);
    const id = `dm-${pair[0]}-${pair[1]}`;
    return channels.some((c) => c.id === id) ? id : null;
  }

  /* One video room per press, named unguessably; the message card is the
   * invitation and the push notification rings everyone else. Jitsi on a
   * free public server — no accounts, no app to install. */
  async function startMeeting() {
    const room = `pluto-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
    try {
      const r = await api("/api/messages", { json: { channel, kind: "meet", body: room } });
      setMessages((prev) => [...prev, r.message]);
      lastId.current = Math.max(lastId.current, r.message.id);
      setMeetRoom(room);
    } catch {}
  }

  async function uploadAndSend(file: File | Blob, kind: "image" | "file" | "voice", name: string, duration?: number) {
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
      <div className="row gap-3">
        <div style={{ width: 38, height: 38, borderRadius: "44% 44% 46% 46%/48% 48% 42% 42%", background: "var(--c-violet)", display: "grid", placeItems: "center", flex: "none" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" /></svg>
        </div>
        <div className="f1">
          <div className="hnum" style={{ fontSize: 22, lineHeight: 1.05 }}>{tx("chat.chat", "Chat")}</div>
          <div className="small muted">{channels.find((c) => c.id === channel)?.label ?? ""}</div>
        </div>
        <button className="btn btn-secondary btn-icon" style={{ flex: "none" }} onClick={startMeeting}
          title={tx("chat.startMeeting", "Start a video meeting")} aria-label={tx("chat.startMeeting", "Start a video meeting")}>
          <Icon d="M15 10l5-3v10l-5-3M3 6h12v12H3Z" size={16} />
        </button>
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
            <option value="">{tx("chat.direct", "Direct…")}</option>
            {dms.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        ) : null}
      </div>
      {/* Tapping the conversation dismisses the keyboard. In the home-screen
          app iOS does not reliably do this on its own, so a rep who finished
          typing was stuck behind the keypad with no way to put it away. */}
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}
        onPointerDown={() => {
          const el = document.activeElement;
          if (el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) el.blur();
        }}
      >
        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: m.mine ? "flex-end" : "flex-start" }}
            onPointerDown={() => { lpTimer.current = setTimeout(() => setActionsFor(m), 480); }}
            onPointerUp={() => { if (lpTimer.current) clearTimeout(lpTimer.current); }}
            onPointerMove={() => { if (lpTimer.current) clearTimeout(lpTimer.current); }}
            onContextMenu={(e) => { e.preventDefault(); setActionsFor(m); }}>
            <span style={{ fontSize: 12, color: "var(--color-neutral-500)" }}>
              {m.mine ? hm(m.ts) : (
                <>
                  {/* Tap a name → their direct chat, when policy allows one. */}
                  {dmIdFor(m.senderId) ? (
                    <button onClick={() => setChannel(dmIdFor(m.senderId)!)}
                      style={{ border: "none", background: "none", padding: 0, cursor: "pointer", font: "inherit", color: "var(--c-violet-deep)", fontWeight: 600 }}>
                      {m.senderName}
                    </button>
                  ) : m.senderName}
                  {` · ${hm(m.ts)}`}
                </>
              )}
            </span>
            {m.replyTo ? (
              <div style={{ fontSize: 11.5, padding: "4px 10px", borderInlineStart: "3px solid var(--c-violet)", background: "var(--color-neutral-200)", borderRadius: 8, maxWidth: 240, color: "var(--color-neutral-600)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.replyTo.senderName}: {m.replyTo.preview}
              </div>
            ) : null}
            {m.kind === "meet" ? (
              <div className={m.mine ? "bubble-out" : "bubble-in"} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--c-green-soft)", color: "var(--c-green-deep)", border: "1px solid var(--c-green)" }}>
                <span style={{ fontSize: 20 }}>📹</span>
                <div>
                  <div className="fs-small w-700">{tx("chat.videoMeeting", "Video meeting")}</div>
                  <div style={{ fontSize: 11.5 }}>{m.senderName}</div>
                </div>
                <button className="btn btn-primary" style={{ fontSize: 12.5, padding: "6px 16px", background: "var(--c-green-deep)", borderColor: "var(--c-green-deep)" }}
                  onClick={() => setMeetRoom(m.body)}>
                  {tx("chat.join", "Join")}
                </button>
              </div>
            ) : m.kind === "image" && m.fileId ? (
              <div onClick={() => openImage(`/api/files?id=${m.fileId}`)} className={m.mine ? "bubble-out" : "bubble-in"} style={{ padding: 4, background: m.mine ? "var(--c-violet)" : undefined, cursor: "pointer" }}>
                <img src={`/api/files?id=${m.fileId}`} alt={m.fileName ?? "image"} style={{ maxWidth: 200, maxHeight: 200, borderRadius: 12, display: "block" }} />
              </div>
            ) : m.kind === "voice" && m.fileId ? (
              <div className={m.mine ? "bubble-out" : "bubble-in"} style={{ padding: "6px 10px", background: m.mine ? "var(--c-violet)" : undefined }}>
                <audio controls src={`/api/files?id=${m.fileId}`} style={{ height: 36, maxWidth: 210 }} />
                {m.duration ? <div style={{ fontSize: 12, opacity: 0.8 }}>{Math.floor(m.duration / 60)}:{String(m.duration % 60).padStart(2, "0")}</div> : null}
              </div>
            ) : m.kind === "file" && m.fileId ? (
              <a href={`/api/files?id=${m.fileId}`} target="_blank" className={m.mine ? "bubble-out" : "bubble-in"} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", background: m.mine ? "var(--c-violet)" : undefined, color: m.mine ? "#fff" : "inherit" }}>
                <Icon d={paths.file} size={15} />
                <span className="fs-small">{m.fileName ?? "file"}</span>
              </a>
            ) : (
              <div className={m.mine ? "bubble-out" : "bubble-in"} style={m.mine ? { background: "var(--c-violet)" } : undefined}>{m.body}</div>
            )}
            {(reactions[m.id] ?? []).length ? (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: -1 }}>
                {Object.entries((reactions[m.id] ?? []).reduce((acc: Record<string, string[]>, r) => {
                  (acc[r.emoji] = acc[r.emoji] ?? []).push(r.name);
                  return acc;
                }, {})).map(([emoji, names]) => (
                  <button key={emoji} title={names.join(", ")} onClick={() => react(m, emoji)}
                    style={{ border: "1px solid var(--color-divider)", background: "var(--color-surface)", borderRadius: 999, padding: "1px 8px", fontSize: 13, cursor: "pointer" }}>
                    {emoji}{names.length > 1 ? <span className="hnum" style={{ fontSize: 11 }}> {names.length}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {recording ? (
        <div className="row" style={{ gap: 9, padding: "8px 12px", borderRadius: 999, background: "var(--c-coral-soft)" }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--c-coral)", flex: "none" }} />
          <span style={{ flex: 1, fontSize: 12, color: "var(--c-coral-deep)" }}>{tx("chat.recordingTapTheMic", "Recording… tap the mic again to send")}</span>
        </div>
      ) : null}
      {replyTo ? (
        <div className="row" style={{ gap: 8, padding: "6px 12px", background: "var(--color-neutral-200)", borderRadius: 12, fontSize: 12 }}>
          <span className="f1" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            ↩ <b>{replyTo.senderName}</b>: {replyTo.kind === "text" ? replyTo.body : replyTo.kind}
          </span>
          <button onClick={() => setReplyTo(null)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
      ) : null}
      <div className="row" style={{ gap: 7 }}>
        <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSend(f, "image", f.name); e.target.value = ""; }} />
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSend(f, "file", f.name); e.target.value = ""; }} />
        <button className="btn btn-secondary btn-icon" style={{ flex: "none", }} onClick={() => imgRef.current?.click()} aria-label={tx("chat.sendImagePh", "Send image")}>
          <Icon d="M21 15l-5-5L5 21M3 5h18v14H3Z" size={15} />
        </button>
        <button className="btn btn-secondary btn-icon" style={{ flex: "none", }} onClick={() => fileRef.current?.click()} aria-label={tx("chat.sendFilePh", "Send file")}>
          <Icon d="M21 12.5 12.5 21a4.95 4.95 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 19" size={15} />
        </button>
        <input
          className="input"
          placeholder={tx("chat.messagePh", "Message…")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          style={{ minHeight: 38, fontSize: 13 }}
        />
        {text.trim() ? (
          <button className="btn btn-icon" style={{ flex: "none", background: "var(--c-violet)", border: "1px solid var(--c-violet)" }} onClick={send} aria-label={tx("chat.sendPh", "Send")}>
            <Icon d={paths.send} size={15} stroke="#fff" />
          </button>
        ) : (
          <button className="btn btn-icon" style={{ flex: "none", background: recording ? "var(--c-coral)" : "var(--c-violet)", border: "none" }} onClick={toggleRecord} aria-label={tx("chat.voiceMessagePh", "Voice message")}>
            <Icon d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3" size={15} stroke="#fff" />
          </button>
        )}
      </div>
      <div className="hint" style={{ textAlign: "center" }}>Empty field shows the mic — tap to record, tap again to send. Type and the same button becomes send.</div>

      {/* Long-press action sheet: react, reply, or jump to their DM. */}
      {actionsFor ? (
        <div onClick={() => setActionsFor(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,10,12,.3)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 14 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-surface)", borderRadius: 20, padding: 14, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 10, paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -4px 30px rgba(0,0,0,.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {["🤑", "💸", "😂", "❤️", "😢", "👍", "🎉"].map((e2) => (
                <button key={e2} onClick={() => react(actionsFor, e2)}
                  style={{ fontSize: 27, background: "none", border: "none", cursor: "pointer", padding: 4 }}>{e2}</button>
              ))}
            </div>
            <button className="btn btn-secondary" style={{ padding: 10 }} onClick={() => { setReplyTo(actionsFor); setActionsFor(null); }}>
              ↩ {tx("chat.reply", "Reply")}
            </button>
            {!actionsFor.mine && dmIdFor(actionsFor.senderId) ? (
              <button className="btn btn-secondary" style={{ padding: 10 }}
                onClick={() => { setChannel(dmIdFor(actionsFor.senderId)!); setActionsFor(null); }}>
                💬 {tx("chat.messageDirect", "Message {name} directly").replace("{name}", actionsFor.senderName)}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* The video room, inside the app. A free public Jitsi server — no
          accounts, nothing to install; × in the corner comes back to chat. */}
      {meetRoom ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#000" }}>
          <iframe
            src={`https://meet.ffmuc.net/${meetRoom}#userInfo.displayName=%22${encodeURIComponent(me.name)}%22&config.prejoinConfig.enabled=false`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ width: "100%", height: "100%", border: 0 }}
          />
          <button onClick={() => setMeetRoom(null)} aria-label="Close"
            style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 10px)", insetInlineEnd: 12, width: 42, height: 42, borderRadius: 999, border: "none", background: "rgba(255,255,255,.2)", color: "#fff", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
      ) : null}
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
