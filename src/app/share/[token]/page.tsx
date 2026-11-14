import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedReport } from "./SharedReport";

// Public: no sign-in. Shows one frozen research path, read-only. Search engines are told not to index it.
export const metadata: Metadata = { title: "Shared report", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) notFound();
  return <SharedReport code={token} />;
}
