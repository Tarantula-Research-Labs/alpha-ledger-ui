import { ExperimentGuard } from "@/features/experiments/ExperimentGuard";
import { WorkspaceShell } from "@/features/shell/WorkspaceShell";
import { SECTION_META } from "@/sections/registry";

// One experiment's workspace: left sidebar with its dashboard and every section.
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  return (
    <WorkspaceShell experiment={experiment} sections={SECTION_META}>
      <ExperimentGuard experiment={experiment}>{children}</ExperimentGuard>
    </WorkspaceShell>
  );
}
