import { getDb } from "@/lib/db";
import { SEED_DEMO } from "@/lib/config";

// Read fresh on every request. Without this Next treats a GET handler that
// never touches cookies as static and bakes the build-time answer in forever.
export const dynamic = "force-dynamic";

// The only endpoint that answers without a session, because the sign-in screen
// needs the company's identity before anyone has signed in. It deliberately
// returns nothing sensitive — no names, no phone numbers.
export async function GET() {
  const s = getDb().settings;
  return Response.json({
    companyName: s.companyName,
    companySub: s.companySub,
    loginFooter: s.loginFooter ?? "",
    hasLogo: !!s.logoId,
    brandColor: s.brandColor,
    terms: s.terms,
    demo: SEED_DEMO,
  });
}
