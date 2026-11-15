"use client";

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

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-1/2 z-10 w-full max-w-md -translate-x-1/2 border-t border-ct-line bg-ct-card"
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  active ? "text-ct-navy" : "text-ct-muted"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
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
