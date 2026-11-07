import { redirect } from "next/navigation";

// Old address: sign-in now happens in a popup on the landing page.
export default function LoginPage() {
  redirect("/?auth=login");
}
