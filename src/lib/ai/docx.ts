import "server-only";

/** .docx has no native Claude document block (that's PDF-only — see extract-profile.ts
 *  and extract-role.ts), so it's converted to plain text locally with mammoth first,
 *  then sent down the same `text` extraction path as pasted text. Throws on a corrupt,
 *  legacy .doc, or non-.docx file — callers turn that into a user-facing error. */
export async function docxToText(base64: string): Promise<string> {
  const { default: mammoth } = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(base64, "base64") });
  return value;
}
