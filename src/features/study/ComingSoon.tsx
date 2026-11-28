import { EmptyState, PageHeader } from "@/core/ui";
import st from "./study.module.css";

// A Study section with no content yet.
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className={st.page}>
      <PageHeader title={title} />
      <EmptyState title="Coming soon">
        <p>{title} isn&apos;t set up yet.</p>
      </EmptyState>
    </div>
  );
}
