import { getDb } from "@/lib/db";
import { brandCss, DEFAULT_BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

// A stylesheet the browser loads in <head>, so the company's colour is painted
// on the very first frame. Doing it here rather than in the layout keeps the
// rest of the app from becoming server-rendered on every request.
export async function GET() {
  let hex = DEFAULT_BRAND;
  try {
    hex = getDb().settings.brandColor || DEFAULT_BRAND;
  } catch {}
  return new Response(brandCss(hex), {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "no-cache, must-revalidate",
    },
  });
}
