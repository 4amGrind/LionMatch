"use client";

// The app scrolls inside the phone frame, not the browser window.
// The browser only resets window scroll when you change pages, so this resets the frame's scroll instead.

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

export default function ScrollArea({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div ref={ref} className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
      {children}
    </div>
  );
}
