"use client";

/* Rafi — the company wolf.
 *
 * A wolf rather than the honey badger he started as. Two practical reasons:
 * pointed ears and a snout give a silhouette you recognise instantly even at
 * 56px, and a suit carries "confident professional" without relying on a facial
 * expression that vanishes when the drawing is small. The badger needed a spiky
 * crest to be identifiable at all, and that crest kept reading as a hat.
 *
 * His tie takes the company's brand colour, so he re-dresses himself for
 * whoever this app is sold to.
 *
 * moods:
 *   idle  — breathes, blinks, ears twitch. The default.
 *   hello — raises a paw and waves. Sign-in.
 *   cheer — both paws up with a hop. A completed day, an approved order.
 */

export type MascotMood = "idle" | "hello" | "cheer";

export function Mascot({
  size = 78,
  mood = "idle",
  className = "",
}: {
  size?: number;
  mood?: MascotMood;
  className?: string;
}) {
  return (
    <svg
      className={`wolf ${className}`}
      data-mood={mood}
      width={size}
      height={size * 1.25}
      viewBox="0 0 140 175"
      fill="none"
      role="img"
      aria-label="Rafi the wolf"
      style={{ overflow: "visible", flex: "none" }}
    >
      <ellipse className="w-shadow" cx="70" cy="169" rx="33" ry="5.5" fill="rgba(76,55,35,.18)" />
      <g className="w-all">
        <path d="M99 148c14 1 24-8 25-20 1-7-4-13-10-11-6 2-7 9-6 15 1 7-3 12-9 13z" fill="#6f7581" />
        <path d="M107 143c8-1 13-7 13-14 0-4-2-7-5-6-3 1-4 6-4 9 0 5-2 9-6 10z" fill="#d7dbe2" />

        <rect x="46" y="140" width="20" height="22" rx="8" fill="#2b3140" />
        <rect x="74" y="140" width="20" height="22" rx="8" fill="#2b3140" />
        <ellipse cx="54" cy="163" rx="14" ry="8" fill="#1b1f29" />
        <ellipse cx="86" cy="163" rx="14" ry="8" fill="#1b1f29" />

        <path d="M38 110c0-13 10-21 32-21s32 8 32 21v27c0 11-8 17-32 17s-32-6-32-17z" fill="#333a4b" />
        <path d="M57 90 L70 120 L83 90 C78 88 62 88 57 90 Z" fill="#f7f8fa" />
        <path d="M55 90 L70 118 L61 90 Z" fill="#2b3140" />
        <path d="M85 90 L70 118 L79 90 Z" fill="#2b3140" />
        <path d="M67 92 L73 92 L75 98 L70 103 L65 98 Z" fill="var(--color-accent)" />
        <path d="M66.5 100 L73.5 100 L76 124 L70 130 L64 124 Z" fill="var(--color-accent)" />
        <path d="M67 92 L73 92 L75 98 L70 103 L65 98 Z" fill="rgba(255,255,255,.18)" />

        {/* Arms hang at his sides so the tie stays visible. Crossed arms read as a
            dark band across the chest and hid the one bit of brand colour. */}
        <g className="w-arm-l">
          <rect x="30" y="104" width="16" height="44" rx="8" fill="#2b3140" />
          <ellipse cx="38" cy="149" rx="9.5" ry="9" fill="#7a808c" />
        </g>
        <g className="w-arm-r">
          <rect x="94" y="104" width="16" height="44" rx="8" fill="#2b3140" />
          <ellipse cx="102" cy="149" rx="9.5" ry="9" fill="#7a808c" />
        </g>

        <g className="w-head">
          <g className="w-ear-l">
            <path d="M42 44 L33 6 L64 28 Z" fill="#7a808c" />
            <path d="M44 40 L38 17 L57 30 Z" fill="#e6b7bd" />
          </g>
          <g className="w-ear-r">
            <path d="M98 44 L107 6 L76 28 Z" fill="#7a808c" />
            <path d="M96 40 L102 17 L83 30 Z" fill="#e6b7bd" />
          </g>

          <path d="M36 54c0-21 15-33 34-33s34 12 34 33c0 15-7 26-17 31-6 3-28 3-34 0-10-5-17-16-17-31z" fill="#7a808c" />
          <path d="M70 24c14 0 24 8 29 20-7-4-17-6-29-6s-22 2-29 6c5-12 15-20 29-20z" fill="#8d939f" />

          {/* Lowered brows — the whole difference between confident and startled. */}
          <path d="M47 52c5-4 11-4 15-1" stroke="#2b2f38" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M93 52c-5-4-11-4-15-1" stroke="#2b2f38" strokeWidth="4.4" strokeLinecap="round" />

          <g className="w-eyes">
            <ellipse cx="56" cy="60" rx="7.6" ry="8" fill="#fff" />
            <ellipse cx="84" cy="60" rx="7.6" ry="8" fill="#fff" />
            <ellipse cx="57.4" cy="61.4" rx="4.3" ry="4.7" fill="#1c1712" />
            <ellipse cx="85.4" cy="61.4" rx="4.3" ry="4.7" fill="#1c1712" />
            <circle cx="59.2" cy="59.2" r="1.7" fill="#fff" />
            <circle cx="87.2" cy="59.2" r="1.7" fill="#fff" />
          </g>

          <path d="M52 76c0-9 8-15 18-15s18 6 18 15c0 10-8 16-18 16s-18-6-18-16z" fill="#dfe3e9" />
          <path d="M63 70c1.9-2.2 4.4-3.3 7-3.3s5.1 1.1 7 3.3c1 1.3-.1 3-1.7 3H64.7c-1.6 0-2.7-1.7-1.7-3z" fill="#1c1712" />
          <path d="M70 73.5v3.6M70 77.1c-2.2 0-4-1.3-4.9-3.2M70 77.1c2.2 0 4-1.3 4.9-3.2"
            stroke="#1c1712" strokeWidth="2.1" strokeLinecap="round" fill="none" />
        </g>
      </g>

      <style>{`
        .wolf .w-all { transform-origin: 70px 165px; animation: w-breathe 3.6s ease-in-out infinite; }
        .wolf .w-shadow { transform-origin: 70px 169px; animation: w-shadow 3.6s ease-in-out infinite; }
        .wolf .w-eyes { transform-origin: 70px 60px; animation: w-blink 5.4s infinite; }
        .wolf .w-ear-l { transform-origin: 52px 40px; animation: w-ear 4.3s ease-in-out infinite; }
        .wolf .w-ear-r { transform-origin: 88px 40px; animation: w-ear 4.3s .4s ease-in-out infinite; }
        .wolf .w-arm-l { transform-origin: 38px 110px; }
        .wolf .w-arm-r { transform-origin: 102px 110px; }

        @keyframes w-breathe { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-3px) scale(1.012); } }
        @keyframes w-shadow { 0%,100% { transform: scaleX(1); opacity:.55; } 50% { transform: scaleX(.92); opacity:.4; } }
        @keyframes w-blink { 0%,93%,100% { transform: scaleY(1); } 96% { transform: scaleY(.08); } }
        @keyframes w-ear { 0%,88%,100% { transform: rotate(0); } 92% { transform: rotate(-7deg); } 96% { transform: rotate(3deg); } }

        .wolf[data-mood="hello"] .w-arm-l { animation: w-wave 2.1s var(--ease-spring, ease-in-out) infinite; }
        @keyframes w-wave {
          0%,14%,100% { transform: rotate(0); }
          32% { transform: rotate(-142deg); }
          48% { transform: rotate(-118deg); }
          64% { transform: rotate(-140deg); }
          82% { transform: rotate(-18deg); }
        }
        .wolf[data-mood="cheer"] .w-arm-l { animation: w-cheer-l 1.5s var(--ease-spring, ease-out) infinite; }
        .wolf[data-mood="cheer"] .w-arm-r { animation: w-cheer-r 1.5s var(--ease-spring, ease-out) infinite; }
        .wolf[data-mood="cheer"] .w-all { animation: w-hop 1.5s var(--ease-spring, ease-out) infinite; }
        @keyframes w-cheer-l { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-152deg); } }
        @keyframes w-cheer-r { 0%,100% { transform: rotate(0); } 50% { transform: rotate(152deg); } }
        @keyframes w-hop { 0%,100% { transform: translateY(0); } 45% { transform: translateY(-8px); } }

        @media (prefers-reduced-motion: reduce) { .wolf * { animation: none !important; } }
      `}</style>
    </svg>
  );
}
