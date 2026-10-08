import "server-only";
import { Resend } from "resend";

// Transactional email only (alerts, introductions, follow-ups). We never relay or store
// conversations: after the introduction, people talk directly (design doc §5.3).

const FROM = process.env.EMAIL_FROM ?? "Trustee Match <hello@example.org>";

let resend: Resend | null = null;

export interface Email {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}

/** Returns the provider message id, or null if email isn't configured (logged instead). */
export async function sendEmail(email: Email): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email:dry-run] to=${Array.isArray(email.to) ? email.to.length : 1} subject="${email.subject}"`);
    return null;
  }
  resend ??= new Resend(key);
  const { data, error } = await resend.emails.send({ from: FROM, ...email });
  if (error) throw new Error(`Email failed: ${error.message}`);
  return data?.id ?? null;
}
