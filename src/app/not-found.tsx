import { ButtonLink, EmptyState } from "@/core/ui";

export default function NotFound() {
  return (
    <main style={{ padding: "48px var(--gutter)" }}>
      <EmptyState title="There's no page at this address." action={<ButtonLink href="/experiments">See all experiments</ButtonLink>}>
        <p>The link may be out of date, or the section name may be misspelled.</p>
      </EmptyState>
    </main>
  );
}
