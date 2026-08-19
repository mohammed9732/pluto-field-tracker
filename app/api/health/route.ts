import { getDb } from "@/lib/db";

// Railway and Render ping this to know the app is alive.
// Read fresh on every request. Without this Next treats a GET handler that
// never touches cookies as static and bakes the build-time answer in forever.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    return Response.json({ ok: true, users: db.users.length });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
