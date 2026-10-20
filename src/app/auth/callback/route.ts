import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where a magic-link email (src/app/sign-in/actions.ts) lands after the user clicks it.
// Exchanges the one-time code for a real Supabase session (cookie set via
// src/lib/supabase/server.ts's createClient, refreshed thereafter by proxy.ts), then
// sends them on to wherever they were trying to go.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=link_expired`);
}
