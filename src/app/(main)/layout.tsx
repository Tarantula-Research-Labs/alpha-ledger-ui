import { Shell } from "@/features/shell/Shell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
