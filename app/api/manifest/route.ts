import { getDb } from "@/lib/db";
import { DEFAULT_BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

// The install card the phone shows, built from the company's own settings so a
// buyer's staff install THEIR app, not one called Pluto.
export async function GET() {
  let name = "Field Tracker";
  let sub = "";
  let color = DEFAULT_BRAND;
  let logo = false;
  try {
    const s = getDb().settings;
    name = s.companyName || name;
    sub = s.companySub || "";
    color = s.brandColor || DEFAULT_BRAND;
    logo = !!s.logoId;
  } catch {}

  const icons = logo
    ? [
        { src: "/api/logo", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/api/logo", sizes: "512x512", type: "image/png", purpose: "any" },
      ]
    : [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }];

  return Response.json(
    {
      name: `${name} Field Tracker`,
      short_name: name.split(" ")[0] || "Field",
      description: sub ? `${name} — ${sub}` : `${name} field sales system`,
      start_url: "/",
      display: "standalone",
      background_color: "#f5f3ef",
      theme_color: color,
      icons,
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-cache" } },
  );
}
