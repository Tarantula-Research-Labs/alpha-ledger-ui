"use client";

// Sign-in and sign-up through Clerk. Clerk draws the popup; these pieces open it and decide where to go after.
import { Show, SignInButton, SignUpButton, UserButton, useAuth, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Button, ButtonLink } from "@/core/ui";

const AFTER_SIGN_IN = "/experiments";

/** Only allow going back to a page of this app (never another site). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : AFTER_SIGN_IN;
}

export function LogInButton({ children = "Log in", variant = "quiet", className }: { children?: ReactNode; variant?: "primary" | "default" | "quiet"; className?: string }) {
  return (
    <SignInButton mode="modal" forceRedirectUrl={AFTER_SIGN_IN} signUpForceRedirectUrl={AFTER_SIGN_IN}>
      <Button variant={variant} className={className}>
        {children}
      </Button>
    </SignInButton>
  );
}

export function SignUpButtonLedger({ children = "Sign up", variant = "primary", className }: { children?: ReactNode; variant?: "primary" | "default" | "quiet"; className?: string }) {
  return (
    <SignUpButton mode="modal" forceRedirectUrl={AFTER_SIGN_IN} signInForceRedirectUrl={AFTER_SIGN_IN}>
      <Button variant={variant} className={className}>
        {children}
      </Button>
    </SignUpButton>
  );
}

export function SignedOut({ children }: { children: ReactNode }) {
  return <Show when="signed-out">{children}</Show>;
}

export function SignedIn({ children }: { children: ReactNode }) {
  return <Show when="signed-in">{children}</Show>;
}

/** For signed-in visitors on the landing page: the way in, and their account menu. */
export function OpenAppButton({ className, children = "Open experiments" }: { className?: string; children?: ReactNode }) {
  return (
    <span className={className}>
      <ButtonLink href={AFTER_SIGN_IN} variant="primary">
        {children}
      </ButtonLink>
    </span>
  );
}

export function AccountMenu() {
  return <UserButton />;
}

/**
 * Opens the popup when the address asks for it: /?auth=login or /?auth=signup.
 * Pages that need sign-in send visitors here with ?next=<page> so they return there afterwards.
 */
export function AutoOpenAuth() {
  const params = useSearchParams();
  const router = useRouter();
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const done = useRef(false);

  const asked = params.get("auth");
  const next = safeNext(params.get("next"));

  useEffect(() => {
    if (!isLoaded || done.current || (asked !== "login" && asked !== "signup")) return;
    done.current = true;
    if (isSignedIn) {
      router.replace(next);
      return;
    }
    const options = { forceRedirectUrl: next, signUpForceRedirectUrl: next, signInForceRedirectUrl: next };
    if (asked === "signup") clerk.openSignUp(options);
    else clerk.openSignIn(options);
    router.replace("/", { scroll: false });
  }, [isLoaded, isSignedIn, asked, next, clerk, router]);

  return null;
}
