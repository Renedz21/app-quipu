"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMyProfile } from "@/modules/auth/hooks/use-my-profile";
import { ExpenseRegisterProvider } from "@/modules/expenses/components/expense-register-provider";
import { AppBottomNav } from "./app-bottom-nav";
import { AppSidebar } from "./app-sidebar";

type Props = {
  children: ReactNode;
};

/** Routes where mobile chrome (bottom nav, FAB, bottom padding) is hidden for immersive UX. */
const IMMERSIVE_PATHS = ["/income/register"];

export function AppLayoutShell({ children }: Props) {
  const profile = useMyProfile();
  const pathname = usePathname();
  const profileName = profile?.name;
  const plan = profile?.plan ?? "free";

  const isImmersive = IMMERSIVE_PATHS.includes(pathname);

  return (
    <ExpenseRegisterProvider>
      <div className="flex min-h-dvh bg-background">
        <AppSidebar
          profileName={profileName}
          plan={plan}
          className="sticky top-0 hidden h-dvh md:flex"
        />
        <div className="flex min-h-dvh flex-1 flex-col">
          {/* On immersive routes the form occupies full dvh; desktop always gets md:pb-8. */}
          <main
            className={isImmersive ? "flex-1 md:pb-8" : "flex-1 pb-24 md:pb-8"}
          >
            {children}
          </main>
          {!isImmersive && (
            <AppBottomNav className="fixed inset-x-0 bottom-0 z-40 md:hidden" />
          )}
        </div>
      </div>
    </ExpenseRegisterProvider>
  );
}
