import Link from "next/link";
import { ToolsIcon } from "@/core/ui/icons";
import o from "./tools-button.module.css";

// Top-bar link to this experiment's Tools page.
export function ToolsButton({ href }: { href: string }) {
  return (
    <Link href={href} className={o.button} title="Snippets and reference for every experiment">
      <ToolsIcon />
      <span className={o.label}>Tools</span>
    </Link>
  );
}
