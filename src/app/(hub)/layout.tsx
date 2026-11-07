import { requireSignedIn } from "@/features/auth/requireSignedIn";
import { HubShell } from "@/features/shell/HubShell";

// Pages outside any single experiment: the experiments list and server status. Signed-in users only.
export default async function HubLayout({ children }: { children: React.ReactNode }) {
  await requireSignedIn();
  return <HubShell>{children}</HubShell>;
}
