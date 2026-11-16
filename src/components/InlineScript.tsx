"use client";

/**
 * A script that runs once, while the browser reads the HTML, before the first paint.
 * On the client it renders as inert text so React does not warn about <script> tags.
 * Pattern from the Next.js guide "Preventing flash before hydration".
 */
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
