"use client";

import Link from "next/link";
import {
  HERO_EMPTY_CTA,
  INCOME_MOBILE_CTA,
} from "@/modules/dashboard/constants";
import { useDashboardSummary } from "@/modules/dashboard/queries";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { DashboardRegisterButton } from "./dashboard-register-button";

export function DashboardHeaderActions() {
  const summary = useDashboardSummary();
  const hasActiveCycle = Boolean(summary?.cycle);

  if (hasActiveCycle) {
    return (
      <div className="flex items-center gap-2">
        {/* «Ingreso» CTA — mobile only, leads to full-screen income register */}
        <Link
          href="/income/register"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "border-line bg-card text-mute hover:bg-surface-soft md:hidden",
          )}
        >
          {INCOME_MOBILE_CTA}
        </Link>
        {/* Expense register (opens bottom sheet) — visible on all sizes */}
        <DashboardRegisterButton />
      </div>
    );
  }

  return (
    <Link
      href="/income/register"
      className={cn(
        buttonVariants({ variant: "secondary", size: "sm" }),
        "bg-ink text-canvas hover:bg-ink/90 md:hidden",
      )}
    >
      {HERO_EMPTY_CTA}
    </Link>
  );
}

export function DashboardMobilePrimaryAction() {
  const summary = useDashboardSummary();
  const hasActiveCycle = Boolean(summary?.cycle);

  if (hasActiveCycle) {
    return null;
  }

  return (
    <Link
      href="/income/register"
      className={cn(
        buttonVariants(),
        "mt-5 rounded-[11px] bg-ink px-5 text-canvas hover:bg-ink/90 md:hidden",
      )}
    >
      {HERO_EMPTY_CTA}
    </Link>
  );
}
