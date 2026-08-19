import { redirect } from "next/navigation";

export default function PaymentsRedirect() {
  redirect("/orders?tab=payments");
}
