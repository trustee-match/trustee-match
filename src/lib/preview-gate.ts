// Site-wide gate for the public preview deploy — not real auth, just a shared password
// so the unfinished site isn't wide open to the internet while real candidate/charity
// auth is still unbuilt (see planning/responsible-design-decisions.md, Security). Every
// path is gated except /enter itself and genuinely static assets; see proxy.ts.

export const PREVIEW_COOKIE = "tm_preview_session";

/** The value a verified session cookie holds. Not a secret in itself — only ever set
 *  server-side after a correct password check, and the cookie is httpOnly so client JS
 *  can't read or forge it. Low-stakes by design: this gate keeps the site off random
 *  crawlers and link-sharing, not a security boundary for sensitive data. */
export const PREVIEW_GRANTED = "granted";

export function previewGateEnabled(): boolean {
  return Boolean(process.env.PREVIEW_PASSWORD);
}

export function checkPreviewPassword(input: string): boolean {
  const expected = process.env.PREVIEW_PASSWORD;
  return Boolean(expected) && input === expected;
}
