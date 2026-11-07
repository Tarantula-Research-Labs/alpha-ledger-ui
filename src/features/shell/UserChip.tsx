import Link from "next/link";
import { SignOutIcon } from "@/core/ui/icons";
import s from "./shell.module.css";

// Who is signed in, and the way out. Sign-in itself will come from Clerk.
export function UserChip() {
  return (
    <span className={s.userWrap}>
      <span className={s.user}>
        <span className={s.avatar} aria-hidden="true">
          L
        </span>
        <span className={s.userName}>Luv</span>
      </span>
      <Link href="/" className={s.signOut} aria-label="Sign out" title="Sign out">
        <SignOutIcon />
      </Link>
    </span>
  );
}
