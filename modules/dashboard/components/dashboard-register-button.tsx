"use client";

import { Add } from "reicon-react";
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
      <Add size={16} color="currentColor" className="mr-2" aria-hidden />
      {showLabel ? REGISTER_CTA : null}
    </Button>
  );
}
