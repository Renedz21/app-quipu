"use client";

import { REGISTER_CTA } from "@/modules/dashboard/constants";
import { useDashboardSummary } from "@/modules/dashboard/hooks/use-dashboard-summary";
import { EXPENSE_NO_CYCLE_HINT } from "@/modules/expenses/constants";
import { useExpenseRegister } from "@/modules/expenses/hooks/use-expense-register-context";
import { Button } from "@/shared/components/ui/button";

type Props = {
  className?: string;
  size?: "default" | "sm" | "icon-lg";
  showLabel?: boolean;
};

export function DashboardRegisterButton({
  className,
  size = "default",
  showLabel = true,
}: Props) {
  const { open } = useExpenseRegister();
  const summary = useDashboardSummary();
  const hasActiveCycle = Boolean(summary?.cycle);

  return (
    <Button
      type="button"
      size={size}
      disabled={!hasActiveCycle}
      title={!hasActiveCycle ? EXPENSE_NO_CYCLE_HINT : REGISTER_CTA}
      onClick={() => open({ variant: "fab" })}
      className={className}
    >
      <span className="relative mr-2 size-[13px]" aria-hidden>
        <span className="absolute top-[5.5px] left-0 h-0.5 w-[13px] rounded-sm bg-canvas" />
        <span className="absolute top-0 left-[5.5px] h-[13px] w-0.5 rounded-sm bg-canvas" />
      </span>
      {showLabel ? REGISTER_CTA : null}
    </Button>
  );
}
