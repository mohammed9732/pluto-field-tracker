"use client";
import Link from "next/link";
import { Mascot, MascotMood } from "./Mascot";

/* Rafi saying something, in a card.
 *
 * Two jobs. On an empty screen he explains what to do next, which is far kinder
 * than the bare "No orders yet" a rep would otherwise stare at. On a good day he
 * celebrates — and celebrating the behaviour you want (a finished route, an
 * approved order) is the cheapest management tool there is.
 */
export function MascotNote({
  mood = "idle",
  title,
  body,
  action,
  tone = "calm",
  size = 74,
}: {
  mood?: MascotMood;
  title: string;
  body?: string;
  action?: { href: string; label: string };
  tone?: "calm" | "win" | "sorry";
  size?: number;
}) {
  return (
    <div className={`mnote ${tone === "win" ? "mnote-win" : tone === "sorry" ? "mnote-sorry" : ""}`}>
      <Mascot size={size} mood={mood} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="mnote-title">{title}</div>
        {body ? <div className="mnote-body">{body}</div> : null}
        {action ? (
          <Link className="btn btn-secondary" href={action.href}
            style={{ fontSize: 12, padding: "7px 14px", marginTop: 9 }}>
            {action.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
