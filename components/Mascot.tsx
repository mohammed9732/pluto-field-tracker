"use client";

/* Rafi — the company honey badger.
 *
 * A honey badger rather than a lion: the animal is famous for refusing to give
 * up, which is the whole job of a field rep. Drawn as one inline SVG so he costs
 * nothing to load, scales to any size, and picks up the company's brand colour
 * in his scarf.
 *
 * moods:
 *   idle  — breathes and blinks. The default everywhere.
 *   wave  — raises a paw. Used on the sign-in screen.
 *   cheer — both paws up. Used when something went well.
 */

export type MascotMood = "idle" | "wave" | "cheer";

export function Mascot({
  size = 72,
  mood = "idle",
  className = "",
}: {
  size?: number;
  mood?: MascotMood;
  className?: string;
}) {
  return (
    <svg
      className={`mascot mascot-${mood} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label="Rafi the honey badger"
      style={{ overflow: "visible", flex: "none" }}
    >
      <defs>
        <clipPath id="rafi-head">
          <path d="M20 58C20 31 37 16 60 16s40 15 40 42c0 19-11 34-25 39-5 2-25 2-30 0C31 92 20 77 20 58Z" />
        </clipPath>
        <linearGradient id="rafi-mantle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdf9f0" />
          <stop offset="1" stopColor="#eadfc6" />
        </linearGradient>
      </defs>

      {/* shadow on the ground, so he sits in the scene rather than floating */}
      <ellipse className="rafi-shadow" cx="60" cy="108" rx="27" ry="5" fill="rgba(76,55,35,.16)" />

      <g className="rafi-body">
        {/* paws sit outside the head silhouette so a wave actually reads */}
        <g className="rafi-paw rafi-paw-l">
          <ellipse cx="30" cy="103" rx="9.5" ry="8.6" fill="#2f2820" />
          <ellipse cx="30" cy="101.2" rx="4.6" ry="3.7" fill="#5f5245" />
        </g>
        <g className="rafi-paw rafi-paw-r">
          <ellipse cx="90" cy="103" rx="9.5" ry="8.6" fill="#2f2820" />
          <ellipse cx="90" cy="101.2" rx="4.6" ry="3.7" fill="#5f5245" />
        </g>

        {/* head — broad at the brow, tapering to a blunt snout */}
        <path
          d="M20 58C20 31 37 16 60 16s40 15 40 42c0 19-11 34-25 39-5 2-25 2-30 0C31 92 20 77 20 58Z"
          fill="#2f2820"
        />

        {/* the pale mantle: a honey badger's whole crown and shoulders, not a cap.
            It runs low at the sides, which is what separates him from a panda. */}
        <g clipPath="url(#rafi-head)">
          <path
            d="M20 58C20 31 37 16 60 16s40 15 40 42c0 4-.4 7.8-1.2 11.4-3.6-6.6-9-10-14.8-11.6C78 56 70 55 60 55s-18 1-24 2.8C30.2 59.4 24.8 62.8 21.2 69.4 20.4 65.8 20 62 20 58Z"
            fill="url(#rafi-mantle)"
          />
          {/* barely-there ear openings — honey badgers have no external ear flaps */}
          <ellipse cx="23.5" cy="52" rx="3.4" ry="5.4" fill="#d8caac" opacity=".75" />
          <ellipse cx="96.5" cy="52" rx="3.4" ry="5.4" fill="#d8caac" opacity=".75" />
        </g>

        {/* scarf — the one place the company colour lands on him */}
        <path d="M31 88c8.5 6.6 17.6 9.6 29 9.6S80.5 94.6 89 88c3.2 3.8 4.6 7.6 4.6 10.6-10 7.6-21 11.4-33.6 11.4S36.4 106.2 26.4 98.6c0-3 1.4-6.8 4.6-10.6Z" fill="var(--color-accent)" />
        <path d="M31 88c8.5 6.6 17.6 9.6 29 9.6S80.5 94.6 89 88c1.5 1.8 2.6 3.6 3.4 5.2-9.6 6.4-20.2 9.6-32.4 9.6S37.2 99.6 27.6 93.2C28.4 91.6 29.5 89.8 31 88Z" fill="rgba(255,255,255,.24)" />

        {/* eyes, sitting on the mantle edge where the pale meets the dark */}
        <g className="rafi-eyes">
          <ellipse cx="45" cy="63" rx="9.8" ry="10.8" fill="#fff" />
          <ellipse cx="75" cy="63" rx="9.8" ry="10.8" fill="#fff" />
          <ellipse className="rafi-pupil" cx="45.9" cy="64.6" rx="5.5" ry="6.2" fill="#1c1712" />
          <ellipse className="rafi-pupil" cx="75.9" cy="64.6" rx="5.5" ry="6.2" fill="#1c1712" />
          <circle cx="48.2" cy="61.4" r="2.2" fill="#fff" />
          <circle cx="78.2" cy="61.4" r="2.2" fill="#fff" />
        </g>

        {/* blunt snout */}
        <ellipse cx="60" cy="82" rx="12.8" ry="9.2" fill="#6b5c4c" />
        <path d="M54.6 77.6c1.4-1.7 3.4-2.6 5.4-2.6s4 .9 5.4 2.6c.8 1-.1 2.3-1.3 2.3h-8.2c-1.2 0-2.1-1.3-1.3-2.3Z" fill="#14100c" />
        <path className="rafi-smile" d="M60 80.4v2.8M60 83.2c-1.8 0-3.3-1-4-2.5M60 83.2c1.8 0 3.3-1 4-2.5"
          stroke="#14100c" strokeWidth="1.9" strokeLinecap="round" fill="none" />
      </g>

      <style>{`
        .mascot { display: block; }
        .rafi-body { transform-origin: 60px 96px; animation: rafi-breathe 3.4s var(--ease-out, ease-in-out) infinite; }
        .rafi-shadow { transform-origin: 60px 107px; animation: rafi-shadow 3.4s ease-in-out infinite; }
        .rafi-eyes { transform-origin: 60px 60px; animation: rafi-blink 5.2s infinite; }
        .rafi-paw-l { transform-origin: 34px 108px; }
        .rafi-paw-r { transform-origin: 86px 108px; }
        .rafi-paw { opacity: 1; }

        @keyframes rafi-breathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-3px) scale(1.015); }
        }
        @keyframes rafi-shadow {
          0%, 100% { transform: scaleX(1); opacity: .5; }
          50%      { transform: scaleX(.9); opacity: .34; }
        }
        @keyframes rafi-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95%           { transform: scaleY(.08); }
        }

        /* wave — one paw up, tipping side to side */
        .mascot-wave .rafi-paw-r {
          animation: rafi-wave 2.1s var(--ease-spring, ease-in-out) infinite;
        }
        @keyframes rafi-wave {
          0%, 12%, 100% { transform: rotate(0deg) translate(0, 0); }
          30%           { transform: rotate(-38deg) translate(2px, -26px); }
          45%           { transform: rotate(-16deg) translate(2px, -26px); }
          60%           { transform: rotate(-36deg) translate(2px, -26px); }
          80%           { transform: rotate(-8deg) translate(1px, -8px); }
        }

        /* cheer — both paws up with a little hop */
        
        .mascot-cheer .rafi-paw-l { animation: rafi-cheer-l 1.4s var(--ease-spring, ease-out) infinite; }
        .mascot-cheer .rafi-paw-r { animation: rafi-cheer-r 1.4s var(--ease-spring, ease-out) infinite; }
        .mascot-cheer .rafi-body { animation: rafi-hop 1.4s var(--ease-spring, ease-out) infinite; }
        @keyframes rafi-cheer-l {
          0%, 100% { transform: rotate(0) translate(0, 0); }
          50%      { transform: rotate(28deg) translate(-3px, -28px); }
        }
        @keyframes rafi-cheer-r {
          0%, 100% { transform: rotate(0) translate(0, 0); }
          50%      { transform: rotate(-28deg) translate(3px, -28px); }
        }
        @keyframes rafi-hop {
          0%, 100% { transform: translateY(0) scale(1); }
          45%      { transform: translateY(-7px) scale(1.03); }
        }

        @media (prefers-reduced-motion: reduce) {
          .rafi-body, .rafi-shadow, .rafi-eyes, .rafi-paw { animation: none !important; }
          
        }
      `}</style>
    </svg>
  );
}
