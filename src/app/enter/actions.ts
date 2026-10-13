"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPreviewPassword, PREVIEW_COOKIE, PREVIEW_GRANTED } from "@/lib/preview-gate";

export async function enterPreview(password: string): Promise<{ ok: false }> {
  if (!checkPreviewPassword(password)) return { ok: false };
  const cookieStore = await cookies();
  cookieStore.set(PREVIEW_COOKIE, PREVIEW_GRANTED, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}
