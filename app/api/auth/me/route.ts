import { getSessionUser } from "@/lib/auth";
import { publicUser } from "@/lib/compute";

export async function GET() {
  const user = getSessionUser();
  return Response.json({ user: user ? publicUser(user) : null });
}
