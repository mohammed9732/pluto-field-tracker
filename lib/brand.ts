// One brand colour in, a full accent ramp out. The app uses nine steps of the
// accent (100 = palest wash behind a tag, 900 = darkest text on that wash), so
// asking an owner to pick nine colours would be cruel and would mostly produce
// unreadable combinations. They pick one; these mixes stay consistent.

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec((hex || "").trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(rgb: [number, number, number]): string {
  return "#" + rgb.map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
}

// amount 0 = keep colour, 1 = fully the target
function mix(rgb: [number, number, number], target: [number, number, number], amount: number): [number, number, number] {
  return [
    rgb[0] + (target[0] - rgb[0]) * amount,
    rgb[1] + (target[1] - rgb[1]) * amount,
    rgb[2] + (target[2] - rgb[2]) * amount,
  ];
}

const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];

export const DEFAULT_BRAND = "#2f6fe0";

// Relative luminance, for deciding whether text on the brand colour is black or white.
export function isLight(hex: string): boolean {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45;
}

export function accentRamp(hex: string): Record<string, string> {
  const base = parseHex(hex) ?? parseHex(DEFAULT_BRAND)!;
  return {
    "--color-accent": toHex(base),
    "--color-accent-100": toHex(mix(base, WHITE, 0.9)),
    "--color-accent-200": toHex(mix(base, WHITE, 0.76)),
    "--color-accent-300": toHex(mix(base, WHITE, 0.52)),
    "--color-accent-400": toHex(mix(base, WHITE, 0.26)),
    "--color-accent-500": toHex(base),
    "--color-accent-600": toHex(mix(base, BLACK, 0.16)),
    "--color-accent-700": toHex(mix(base, BLACK, 0.34)),
    "--color-accent-800": toHex(mix(base, BLACK, 0.52)),
    "--color-accent-900": toHex(mix(base, BLACK, 0.68)),
  };
}

export function brandCss(hex: string): string {
  const ramp = accentRamp(hex);
  const body = Object.entries(ramp).map(([k, v]) => k + ":" + v + ";").join(" ");
  // :root:root outranks the stylesheet defaults whichever order they load in.
  return ":root:root { " + body + " }";
}
