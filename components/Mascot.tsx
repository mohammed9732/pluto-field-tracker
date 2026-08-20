"use client";
import { useState } from "react";

/* The company mascot.
 *
 * The artwork lives behind /api/mascot, which serves whatever was uploaded in
 * the control panel and otherwise the character shipped inside the app. This
 * component never needs to know which is in play, and a fresh deployment shows
 * the right thing immediately rather than waiting for somebody to upload four
 * files by hand.
 *
 * A flat image cannot move its own arms, so the whole picture carries the
 * performance: a slow breath when idle, a tilt when greeting, a hop when
 * cheering, a heavier settle when the news is bad.
 */

export type MascotMood = "idle" | "hello" | "cheer" | "sad";

export function Mascot({
  size = 78,
  mood = "idle",
  className = "",
}: {
  size?: number;
  mood?: MascotMood;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  // Render nothing rather than a broken-image icon. The mascot is decoration; it
  // should never be the reason a screen looks wrong.
  if (broken) return null;

  return (
    <img
      src={`/api/mascot?mood=${mood}`}
      alt=""
      aria-hidden="true"
      data-mood={mood}
      className={`mascot-art ${className}`}
      onError={() => setBroken(true)}
      // A square box with object-fit: contain. Poses differ a lot in shape — arms
      // spread wide is far wider than hands on hips — and sizing by either
      // dimension alone made him grow and shrink between screens.
      style={{
        width: size * 1.3,
        height: size * 1.3,
        objectFit: "contain",
        flex: "none",
        display: "block",
      }}
    />
  );
}
