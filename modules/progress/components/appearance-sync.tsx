"use client";

import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export function AppearanceSync() {
  const appearance = useQuery(api.progress.getAppearance, {});

  useEffect(() => {
    const root = document.documentElement;
    if (!appearance) return;

    root.classList.toggle("dark", appearance.theme === "tinta");
    root.dataset.accent = appearance.accent;
    root.dataset.appIcon = appearance.appIcon;
  }, [appearance]);

  return null;
}
