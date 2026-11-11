import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/env";
import { PREVIEW_COOKIE, PREVIEW_GRANTED, previewGateEnabled } from "@/lib/preview-gate";

// Site-wide preview gate, then keeps the Supabase auth session fresh. Authorisation
// itself (who can do what once past the gate) is enforced by RLS and server-side
// checks, not here — this is only the "is this a known tester" layer for the public
// preview deploy (see planning/responsible-design-decisions.md, Security).
export async function proxy(request: NextRequest) {
  // /about, /terms and /privacy stay readable without the password, so anyone can check
  // how their data is handled before entering anything. /auth/callback and /auth/confirm
  // must also stay reachable regardless of the gate — a magic-link email can be opened on
  // a different device/browser than the one that originally entered the site password, and
  // the whole point of /auth/confirm (see that page's own comment) is to survive a mail
  // security scanner prefetching it, which can't be assumed to hold the gate cookie either.
  const ungated = ["/enter", "/about", "/terms", "/privacy", "/auth/callback", "/auth/confirm"];
  if (previewGateEnabled() && !ungated.includes(request.nextUrl.pathname)) {
    const cookie = request.cookies.get(PREVIEW_COOKIE)?.value;
    if (cookie !== PREVIEW_GRANTED) {
      return NextResponse.redirect(new URL("/enter", request.url));
    }
  }

  if (!supabaseConfigured()) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron|api/admin|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
