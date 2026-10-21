import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Source_Serif_4 } from "next/font/google";
import { DemoModeWidget } from "@/components/demo-mode/demo-mode-widget";
import { NavAuth } from "@/components/nav-auth";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trustee Match",
  description: "Matching skilled islanders with Bailiwick charity boards that need them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-line bg-surface">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-serif text-xl font-semibold text-sea">
              Trustee Match
            </Link>
            <div className="flex gap-4 text-sm text-ink-muted">
              <NavAuth />
              <Link href="/charity" className="hover:text-ink">For charities</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-ink-muted">
          Source code licensed under MIT.
        </footer>
        <DemoModeWidget />
      </body>
    </html>
  );
}
