import type { Metadata } from "next";
import { DrivePage } from "@/features/drive/DrivePage";

export const metadata: Metadata = { title: "Drive" };

export default function Drive() {
  return <DrivePage />;
}
