"use client";

import type { ReactNode } from "react";
import { useMyProfile } from "@/modules/auth/hooks/use-my-profile";
import { ExpenseRegisterProvider } from "@/modules/expenses/components/expense-register-provider";
import { AppBottomNav } from "./app-bottom-nav";
import { AppSidebar } from "./app-sidebar";

type Props = {
  children: ReactNode;
};

export function AppLayoutShell({ children }: Props) {
  const profile = useMyProfile();
  const profileName = profile?.name;
  const plan = profile?.plan ?? "free";

  return (
    <ExpenseRegisterProvider>
      <div className="flex min-h-dvh bg-background">
        <AppSidebar
          profileName={profileName}
          plan={plan}
          className="sticky top-0 hidden h-dvh md:flex"
        />
        <div className="flex min-h-dvh flex-1 flex-col">
          <main className="flex-1 pb-24 md:pb-8">{children}</main>
          <AppBottomNav className="fixed inset-x-0 bottom-0 z-40 md:hidden" />
        </div>
      </div>
    </ExpenseRegisterProvider>
  );
}
