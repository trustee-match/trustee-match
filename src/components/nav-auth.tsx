"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuthStatus, signOut, type AuthStatus } from "@/app/sign-in/actions";

const DEFAULT_STATUS: AuthStatus = { signedIn: false, email: null, hasConfirmedProfile: false, hasCharityRole: false };

/** Both role links' labels — "Become a trustee"/"See your matches",
 *  "For charities"/"See your roles" — plus sign-in/sign-out, from one consolidated
 *  session check on mount (getAuthStatus) rather than several separate round trips.
 *  Checked client-side, same reasoning as DemoModeWidget's amIOperator(): keeps the root
 *  layout itself session-independent under Cache Components (next.config.ts) rather than
 *  making every page in the app dynamic. Defaults to the signed-out state until the check
 *  resolves; /join and /charity always route to the right place regardless of what the
 *  nav shows in the meantime (their own Gates redirect someone who already has a profile
 *  straight to it).
 *
 *  Jon, 2026-10-21: a signed-out visitor needs the UI to visibly offer *both*
 *  "sign in, if you have an account" and "register as a trustee or charity" — mechanically
 *  the same path (both land on /sign-in's magic-link form), but the labels matter so
 *  someone returning doesn't read "Become a trustee" as "only for new people". Hence the
 *  explicit "Sign in" link below, alongside the two role links, rather than relying on
 *  the role links alone to communicate both meanings at once. */
export function NavAuth() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>(DEFAULT_STATUS);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getAuthStatus().then(setStatus);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setStatus(DEFAULT_STATUS);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <Link href="/join" className="hover:text-ink">
        {status.hasConfirmedProfile ? "See your matches" : "Become a trustee"}
      </Link>
      <Link href="/charity" className="hover:text-ink">
        {status.hasCharityRole ? "See your roles" : "For charities"}
      </Link>
      {status.signedIn ? (
        <button type="button" onClick={handleSignOut} disabled={signingOut} className="hover:text-ink disabled:opacity-50" title={status.email ?? undefined}>
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      ) : (
        <Link href="/sign-in" className="hover:text-ink">
          Sign in
        </Link>
      )}
    </>
  );
}
