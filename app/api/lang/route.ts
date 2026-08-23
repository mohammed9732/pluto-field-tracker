import { getDb, saveDb } from "@/lib/db";
import { requireUser, errResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Anyone may change their OWN language. Deliberately not an admin action: the
// accountant should not have to ask permission to read her own screens in Arabic.
export async function POST(req: Request) {
  try {
    const user = requireUser();
    const { lang } = await req.json();
    if (lang !== "en" && lang !== "ar") {
      return Response.json({ error: "Unknown language" }, { status: 400 });
    }
    const db = getDb();
    const me = db.users.find((u) => u.id === user.id);
    if (!me) return Response.json({ error: "Not found" }, { status: 404 });
    me.lang = lang;
    saveDb();
    return Response.json({ ok: true, lang });
  } catch (e) {
    return errResponse(e);
  }
}
