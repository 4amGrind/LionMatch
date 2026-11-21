import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import InlineScript from "@/components/InlineScript";
import ScrollArea from "@/components/ScrollArea";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

// One family for the whole app: clean and regular, set semibold for headlines.
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Columbia Tinder",
  description: "Swipe on internships, clubs, and research at Columbia.",
  // Opened from an iPhone home screen, the app fills the screen with no browser bars.
  appleWebApp: { capable: true, title: "Columbia Tinder", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b9d9eb" },
    { media: "(prefers-color-scheme: dark)", color: "#06132a" },
  ],
};

// Runs before the page paints, so a saved dark theme never flashes light first.
// Uses the saved choice, or the system setting if there is none. Key matches THEME_KEY in ThemeToggle.tsx.
const themeScript = `(function(){try{var t=localStorage.getItem("ct.theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script changes <html> before React loads, so React should not warn about it.
    <html lang="en" data-theme="light" className={`${instrument.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body className="min-h-full font-sans">
        {/*
          The app always has phone proportions. On a phone it fills the screen.
          On a wider screen it sits in a phone-shaped frame, centered on a solid color.
        */}
        <div className="flex min-h-dvh items-center justify-center sm:p-6">
          <div className="relative isolate flex h-dvh w-full max-w-[430px] flex-col overflow-hidden sm:h-[min(880px,calc(100dvh-48px))] sm:rounded-[52px] sm:border-[10px] sm:border-[#050c18] sm:shadow-[0_40px_80px_-30px_rgb(0_0_0/0.55)]">
            <div className="ct-backdrop" aria-hidden="true" />
            <ScrollArea>
              <header className="glass sticky top-3 z-20 mx-4 mt-3 flex shrink-0 items-center justify-between rounded-[22px] py-1.5 pl-3 pr-1.5">
                <Link href="/" className="display flex items-center gap-2 text-[19px] text-ct-navy">
                  {/*
                    Columbia crown. The image is used as a stencil filled with the text color,
                    so it always matches the name beside it in light and dark mode. Decorative, so hidden from screen readers.
                  */}
                  <span
                    aria-hidden="true"
                    className="size-[30px] -my-1 shrink-0 bg-current [mask:url(/brand/crown.png)_center/contain_no-repeat]"
                  />
                  Columbia Tinder
                </Link>
                <div className="flex items-center gap-0.5">
                  <ThemeToggle />
                  <Link
                    href="/history"
                    className="rounded-full px-3 py-2 text-sm font-semibold text-ct-navy transition-colors hover:bg-ct-blue-deep"
                  >
                    History
                  </Link>
                </div>
              </header>
              <main className="flex flex-1 flex-col px-4 pb-24 pt-4">{children}</main>
            </ScrollArea>
            <BottomNav />
            {/* Confetti draws here, so it stays inside the phone and disappears at its edges. Used by SwipeDeck. */}
            <canvas data-confetti aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 size-full" />
          </div>
        </div>
      </body>
    </html>
  );
}
