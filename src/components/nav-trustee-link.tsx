"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hasConfirmedProfile } from "@/app/join/actions";

/** "Become a trustee" vs "See your matches" — checked client-side on mount (same pattern
 *  as DemoModeWidget's amIOperator()) so the root layout doesn't need to read cookies,
 *  which would make every page in the app session-dependent under Cache Components
 *  (next.config.ts). Defaults to the signed-out label until the check resolves; /join
 *  itself always routes to the right place regardless (src/app/join/page.tsx redirects a
 *  confirmed candidate straight to their own matches). */
export function TrusteeNavLink() {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    hasConfirmedProfile().then(setConfirmed);
  }, []);

  return (
    <Link href="/join" className="hover:text-ink">
      {confirmed ? "See your matches" : "Become a trustee"}
    </Link>
  );
}
