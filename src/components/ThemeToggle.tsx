"use client";

// Light and dark mode switch. The choice is saved in this browser.
// The script in layout.tsx applies the saved choice (or the system setting) before the page paints.

import { AnimatePresence, motion } from "motion/react";
import { useState, useSyncExternalStore } from "react";

export const THEME_KEY = "ct.theme";
type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(next: Theme) {
  const root = document.documentElement;
  root.dataset.theme = next;
  root.style.colorScheme = next;
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage blocked. The theme still changes for this visit.
  }
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as const);
  const next: Theme = theme === "dark" ? "light" : "dark";
  // The icon only spins when you tap it. On page load the button starts as the sun and then
  // learns the real theme, and that switch should be instant, not an animation.
  const [tapped, setTapped] = useState(false);

  function toggle() {
    setTapped(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Cross-fade the whole page where the browser supports it.
    if (!reduce && document.startViewTransition) {
      document.startViewTransition(() => applyTheme(next));
    } else {
      applyTheme(next);
    }
  }

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.9 }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="relative flex size-9 items-center justify-center overflow-hidden rounded-full text-ct-navy transition-colors hover:bg-ct-blue-deep"
    >
      {/*
        Both icons are pinned to the exact center of the button, on top of each other, so while one
        spins out and the other spins in, neither one pushes the other sideways.
      */}
      <AnimatePresence initial={false}>
        <motion.svg
          key={theme}
          viewBox="0 0 24 24"
          className="absolute inset-0 m-auto size-[19px]"
          aria-hidden="true"
          initial={tapped ? { rotate: -90, scale: 0.5, opacity: 0 } : false}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={tapped ? { rotate: 90, scale: 0.5, opacity: 0 } : undefined}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        >
          {theme === "dark" ? (
            // Moon: you are in dark mode.
            <path
              d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"
              fill="currentColor"
            />
          ) : (
            // Sun: you are in light mode.
            <g fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
              <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
            </g>
          )}
        </motion.svg>
      </AnimatePresence>
    </motion.button>
  );
}
