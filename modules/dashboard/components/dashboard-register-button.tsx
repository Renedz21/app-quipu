"use client";

import { Add } from "reicon-react";
import { REGISTER_CTA } from "@/modules/dashboard/constants";
import { useDashboardSummary } from "@/modules/dashboard/queries";
import { EXPENSE_NO_CYCLE_HINT } from "@/modules/expenses/constants";
import { useExpenseRegister } from "@/modules/expenses/hooks/use-expense-register-context";
import { Button, buttonVariants } from "@/shared/components/ui/button";

type Props = {
  size?: "default" | "sm" | "icon-lg";
  showLabel?: boolean;
};

export function DashboardRegisterButton({
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
      className={buttonVariants({ variant: "secondary", size: "sm" })}
    >
      <Add size={16} color="currentColor" className="mr-2" aria-hidden />
      {showLabel ? REGISTER_CTA : null}
    </Button>
  );
}
