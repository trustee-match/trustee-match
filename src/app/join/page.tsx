import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JoinFlow } from "./join-flow";

export const metadata = { title: "Become a trustee · Trustee Match" };

// Real sign-in gate (issues #8/#12/#13): no session → off to /sign-in first. Session +
// an already-confirmed profile → straight to their own matches, the "my matches"
// dashboard the design notes called for (src/app/join/candidate/[candidateId]/page.tsx
// is already that page). Session + no confirmed profile yet → the CV/LinkedIn import and
// review flow below, same as always, just no longer asking for a name/email with no way
// to verify either.
export default async function JoinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/join");

  const { data: candidate } = await supabase.from("candidates").select("id").eq("id", user.id).not("confirmed_at", "is", null).maybeSingle();
  if (candidate) redirect(`/join/candidate/${user.id}`);

  return <JoinFlow email={user.email ?? ""} />;
}
