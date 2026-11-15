import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Columbia Tinder",
  description: "Swipe on internships, clubs, and research at Columbia.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b9d9eb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* The app is one phone-width column, centered on bigger screens. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-ct-page sm:border-x sm:border-ct-line">
          <header className="sticky top-0 z-10 flex items-center justify-between bg-ct-blue px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-ct-navy">
              Columbia Tinder
            </Link>
            <Link href="/history" className="text-sm font-medium text-ct-navy underline-offset-4 hover:underline">
              History
            </Link>
          </header>
          <main className="flex flex-1 flex-col px-4 pb-24 pt-4">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
