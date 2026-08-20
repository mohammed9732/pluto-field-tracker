"use client";
import { useEffect, useRef, useState } from "react";

// Numbers that settle into place rather than snapping.
//
// Used on dashboard figures only — never on a running total the person is
// actively changing, where an animating number reads as lag rather than polish.
export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  ms = 900,
}: {
  value: number;
  format?: (n: number) => string;
  ms?: number;
}) {
  // Start at zero so the first paint has somewhere to travel from. Rendering
  // the final value immediately is what silently kills a count-up.
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  const frame = useRef<number>();

  useEffect(() => {
    // Respect the system setting — some people get motion sick, and a ticking
    // number is exactly the sort of thing that setting exists for.
    const still = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (still || !Number.isFinite(value)) {
      setShown(value);
      from.current = value;
      return;
    }

    const start = performance.now();
    const a = from.current;
    const b = value;
    if (a === b) return;

    // Safety net. requestAnimationFrame is paused in a hidden or backgrounded
    // tab, and a figure frozen at 0 while the real number is 17,023,000 IQD is
    // far worse than no animation at all. This guarantees the true value lands
    // whether or not a single frame ever runs.
    const settle = setTimeout(() => {
      setShown(b);
      from.current = b;
    }, ms + 400);

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      // Decelerating curve: quick off the mark, gentle arrival.
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(a + (b - a) * eased);
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      clearTimeout(settle);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, ms]);

  return <>{format(shown)}</>;
}
