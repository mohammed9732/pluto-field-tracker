"use client";
import Link from "next/link";

// Every doctor name in the app opens that doctor's profile.
export function DoctorLink({ id, name, style }: { id?: number | null; name: string; style?: React.CSSProperties }) {
  if (!id) return <>{name}</>;
  return (
    <Link href={`/doctors/${id}`} style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "var(--color-neutral-400)", textUnderlineOffset: 3, ...style }}>
      {name}
    </Link>
  );
}

// WhatsApp / phone call button used on team cards and in direct chats.
export function CallButton({ phone, name, size = 30 }: { phone?: string | null; name?: string; size?: number }) {
  if (!phone) return null;
  const digits = String(phone).replace(/[^0-9]/g, "");
  if (!digits) return null;
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener"
      aria-label={name ? `Call ${name} on WhatsApp` : "Call on WhatsApp"}
      title={name ? `WhatsApp ${name}` : "WhatsApp"}
      style={{ width: size, height: size, borderRadius: 999, background: "var(--c-green-soft)", display: "grid", placeItems: "center", flex: "none" }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="var(--c-green-deep)" strokeWidth="1.7">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
      </svg>
    </a>
  );
}
