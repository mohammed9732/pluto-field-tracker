import { getDb } from "@/lib/db";
import { SEED_DEMO } from "@/lib/config";

// The only endpoint that answers without a session, because the sign-in screen
// needs the company name before anyone has signed in. It deliberately returns
// nothing sensitive — no names, no phone numbers.
// Read fresh on every request. Without this Next treats a GET handler that
// never touches cookies as static and bakes the build-time answer in forever.
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  return Response.json({
    companyName: db.settings.companyName,
    companySub: db.settings.companySub,
    cities: db.settings.cities.map((c) => c.name),
    demo: SEED_DEMO,
  });
}
