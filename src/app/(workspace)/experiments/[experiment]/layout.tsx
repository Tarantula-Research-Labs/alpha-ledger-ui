import { MarksProvider } from "@/data/marks";
import { requireSignedIn } from "@/features/auth/requireSignedIn";
import { ExperimentGuard } from "@/features/experiments/ExperimentGuard";
import { WorkspaceShell } from "@/features/shell/WorkspaceShell";
import { SECTION_META } from "@/sections/registry";

// One experiment's workspace: left sidebar with its dashboard and every section. Signed-in users only.
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ experiment: string }>;
}) {
  await requireSignedIn();
  const { experiment } = await params;
  return (
    <MarksProvider experiment={experiment}>
      <WorkspaceShell experiment={experiment} sections={SECTION_META}>
        <ExperimentGuard experiment={experiment}>{children}</ExperimentGuard>
      </WorkspaceShell>
    </MarksProvider>
  );
}
