"use client";

import { useRouter } from "next/navigation";
import { Add } from "reicon-react";
import { HERO_EMPTY_CTA } from "@/modules/dashboard/constants";
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
      // With an active cycle the FAB opens the expense sheet exclusively,
      // so label it "Registrar gasto" to avoid semantic collision with the
      // «+ Ingreso» CTA now shown in the dashboard header.
      aria-label={hasActiveCycle ? "Registrar gasto" : HERO_EMPTY_CTA}
      onClick={() => {
        if (hasActiveCycle) {
          open({ variant: "fab" });
          return;
        }
        router.push("/income/register");
      }}
      className="size-13 rounded-full bg-ink text-canvas shadow-[0_10px_24px_-8px_color-mix(in_oklch,var(--qp-ink)_50%,transparent)] hover:bg-ink/90"
    >
      <Add size={48} color="var(--qp-canvas)" aria-hidden />
    </Button>
  );
}
