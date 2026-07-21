"use client";

import Link from "next/link";
import { HERO_EMPTY_CTA } from "@/modules/dashboard/constants";
import { useDashboardSummary } from "@/modules/dashboard/hooks/use-dashboard-summary";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { DashboardRegisterButton } from "./dashboard-register-button";

type Props = {
  className?: string;
};

export function DashboardHeaderActions({ className }: Props) {
  const summary = useDashboardSummary();
  const hasActiveCycle = Boolean(summary?.cycle);

  if (hasActiveCycle) {
    return <DashboardRegisterButton className={className} />;
  }

  return (
    <Link
      href="/income/register"
      className={
        className ??
        cn(
          buttonVariants(),
          "hidden h-11 rounded-[11px] bg-ink px-[18px] text-sm font-semibold text-canvas hover:bg-ink/90 md:inline-flex",
        )
      }
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
