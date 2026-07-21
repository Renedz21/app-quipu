import type { ReactNode } from "react";
import { AppLayoutShell } from "@/shared/components/layout/app-layout-shell";

/** Auth gates live in each `page.tsx` via `requireOnboardedProfile` (QUIPU-MASTER §5.4). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppLayoutShell>{children}</AppLayoutShell>;
}
