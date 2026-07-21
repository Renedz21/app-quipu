"use client";

import { useRouter } from "next/navigation";
import { HERO_EMPTY_CTA, REGISTER_CTA } from "@/modules/dashboard/constants";
import { useDashboardSummary } from "@/modules/dashboard/hooks/use-dashboard-summary";
import { useExpenseRegister } from "@/modules/expenses/hooks/use-expense-register-context";
import { Button } from "@/shared/components/ui/button";

export function DashboardFab() {
  const router = useRouter();
  const { open } = useExpenseRegister();
  const summary = useDashboardSummary();
  const hasActiveCycle = Boolean(summary?.cycle);

  return (
    <Button
      type="button"
      size="icon-lg"
      aria-label={hasActiveCycle ? REGISTER_CTA : HERO_EMPTY_CTA}
      onClick={() => {
        if (hasActiveCycle) {
          open({ variant: "fab" });
          return;
        }
        router.push("/income/register");
      }}
      className="size-[52px] rounded-full bg-ink text-canvas shadow-[0_10px_24px_-8px_color-mix(in_oklch,var(--qp-ink)_50%,transparent)] hover:bg-ink/90"
    >
      <span className="relative size-[18px]" aria-hidden>
        <span className="absolute top-2 left-0 h-0.5 w-[18px] rounded-sm bg-canvas" />
        <span className="absolute top-0 left-2 h-[18px] w-0.5 rounded-sm bg-canvas" />
      </span>
    </Button>
  );
}
