"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Swipe", icon: "M4 5h12v14H4zM8 3h12v14" },
  { href: "/explore", label: "Explore", icon: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l5 5" },
  { href: "/chats", label: "Chats", icon: "M4 5h16v11H9l-5 4z" },
  { href: "/profile", label: "Profile", icon: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/explore") return pathname.startsWith("/explore") || pathname.startsWith("/opportunities");
  if (href === "/chats") return pathname.startsWith("/chats") || pathname.startsWith("/people");
  return pathname.startsWith(href) || pathname.startsWith("/preferences") || pathname.startsWith("/history");
}

/** A floating glass dock. A brighter glass lens slides to whichever tab is open. */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="lg-on-dark absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <ul className="glass grid grid-cols-4 gap-1 rounded-[26px] p-1.5">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="relative">
              {active ? (
                <motion.span
                  layoutId="nav-active"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[20px] bg-white/20 shadow-[inset_0_1px_0.5px_rgb(255_255_255/0.7),inset_0_-1px_0.5px_rgb(255_255_255/0.25),inset_0_0_0_0.5px_rgb(255_255_255/0.3),0_6px_16px_-8px_rgb(0_0_0/0.5)]"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              ) : null}
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 rounded-[20px] py-2 text-[11px] font-semibold transition-colors ${
                  active ? "text-ct-navy" : "text-ct-muted hover:text-ct-navy"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-[22px] w-[22px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.25 : 1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
