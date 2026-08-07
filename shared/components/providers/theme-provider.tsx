"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      // SSR keeps the default executable script (anti-FOUC). On the client,
      // React 19 warns about <script> in components — use a data-only type
      // after hydration; the script already ran from the initial HTML.
      scriptProps={
        typeof window === "undefined" ? undefined : { type: "application/json" }
      }
    >
      {children}
    </NextThemesProvider>
  );
}
