import { HubShell } from "@/features/shell/HubShell";

// Pages outside any single experiment: the experiments list and server status.
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <HubShell>{children}</HubShell>;
}
