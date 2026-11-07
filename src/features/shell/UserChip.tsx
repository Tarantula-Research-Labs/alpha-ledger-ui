"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { clerkGraphiteAppearance } from "@/core/clerkAppearance";
import { useTheme } from "@/core/theme";
import s from "./shell.module.css";

// Who is signed in (from Clerk). The avatar opens Clerk's menu: manage account, sign out.
export function UserChip() {
  const { user } = useUser();
  const { theme } = useTheme();
  const name = user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "";
  return (
    <span className={s.userWrap}>
      {name && <span className={`${s.user} ${s.userName}`}>{name}</span>}
      <UserButton appearance={theme === "light" ? clerkGraphiteAppearance : undefined} />
    </span>
  );
}
