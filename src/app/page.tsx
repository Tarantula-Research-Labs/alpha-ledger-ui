import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingPage } from "@/features/landing/LandingPage";
import { SECTION_META } from "@/sections/registry";

export const metadata: Metadata = {
  title: "Alpha Ledger: versioned, traceable ML trading research",
};

export default function Home() {
  return (
    <Suspense>
      <LandingPage sections={SECTION_META} />
    </Suspense>
  );
}
