import { getSessionUser } from "@/lib/auth";
import { publicUser } from "@/lib/compute";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = getSessionUser();
  if (!user) return Response.json({ user: null });
  const s = getDb().settings;
  // Every screen already calls this on mount, so it is the cheapest place to
  // hand out the company's wording and logo state.
  return Response.json({
    user: publicUser(user),
    terms: s.terms,
    companyName: s.companyName,
    hasLogo: !!s.logoId,
  });
}
