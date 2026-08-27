import { redirect } from "next/navigation";

/* Folded into Pay people (/acct/payroll) — monthly wages and quarterly
 * incentives are one job, and answering "is this person fully paid?" should
 * not take two pages. The route stays so old links and habits keep working. */
export default function PayoutsMoved() {
  redirect("/acct/payroll");
}
