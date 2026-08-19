import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function Root() {
  const user = getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "accountant") redirect("/acct/queue");
  if (user.role === "admin") redirect("/admin");
  if (user.role === "supervisor") redirect("/approvals");
  redirect("/home");
}
