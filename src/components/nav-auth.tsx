"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuthStatus, signOut } from "@/app/sign-in/actions";

/** "Become a trustee" vs "See your matches", plus a sign-out control when signed in — one
 *  consolidated session check on mount (getAuthStatus) rather than the nav triggering
 *  several separate round trips. Checked client-side, same reasoning as DemoModeWidget's
 *  amIOperator(): keeps the root layout itself session-independent under Cache Components
 *  (next.config.ts) rather than making every page in the app dynamic. Defaults to the
 *  signed-out state until the check resolves; /join itself always routes to the right
 *  place regardless of what the nav shows (src/app/join/page.tsx redirects a confirmed
 *  candidate straight to their own matches). */
export function NavAuth() {
  const router = useRouter();
  const [status, setStatus] = useState<{ signedIn: boolean; email: string | null; hasConfirmedProfile: boolean }>({
    signedIn: false,
    email: null,
    hasConfirmedProfile: false,
  });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getAuthStatus().then(setStatus);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setStatus({ signedIn: false, email: null, hasConfirmedProfile: false });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <Link href="/join" className="hover:text-ink">
        {status.hasConfirmedProfile ? "See your matches" : "Become a trustee"}
      </Link>
      {status.signedIn && (
        <button type="button" onClick={handleSignOut} disabled={signingOut} className="hover:text-ink disabled:opacity-50" title={status.email ?? undefined}>
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      )}
    </>
  );
}
