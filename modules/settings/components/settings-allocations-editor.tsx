"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AnalyticsEvents, track } from "@/core/analytics";
import { fromConvexError } from "@/core/errors";
import { AllocationBar } from "@/modules/onboarding/components/allocation-bar";
import { AllocationRow } from "@/modules/onboarding/components/allocation-row";
import { CheckMark } from "@/modules/onboarding/components/check-mark";
import type { Allocation } from "@/modules/onboarding/lib/allocation";
import { BackLink } from "@/shared/components/ui/back-link";
import { Button } from "@/shared/components/ui/button";
import { ENVELOPES } from "@/shared/constants/envelopes";
import { formatCents } from "@/shared/lib/money";
import { useUpdateAllocations } from "../actions";
import {
  SETTINGS_ALLOCATIONS_NEXT_CYCLE,
  SETTINGS_ALLOCATIONS_PAGE_BODY,
  SETTINGS_ALLOCATIONS_PAGE_TITLE,
  SETTINGS_ALLOCATIONS_SAVE,
  SETTINGS_ALLOCATIONS_SAVED,
  SETTINGS_SYSTEM_HEADING,
} from "../constants";
import { useSettingsDashboardSummary } from "../queries";

type SettingsAllocationsEditorProps = {
  initialAllocation: Allocation;
};

export function SettingsAllocationsEditor({
  initialAllocation,
}: SettingsAllocationsEditorProps) {
  const router = useRouter();
  const summary = useSettingsDashboardSummary();
  const updateAllocations = useUpdateAllocations();
  const [state, setState] = useState<Allocation>(initialAllocation);
  const [isPending, startTransition] = useTransition();

  if (summary === undefined) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col px-5 py-6">
        <div className="h-4 w-24 animate-pulse rounded bg-line" />
        <div className="mt-4 h-8 w-48 animate-pulse rounded bg-line" />
      </div>
    );
  }

  const total =
    state.allocationNeeds + state.allocationWants + state.allocationSavings;
  const cycleIncome =
    summary?.envelopes?.reduce(
      (sum: number, env: { allocatedAmount: number }) =>
        sum + env.allocatedAmount,
      0,
    ) ?? 0;

  function perCycleCents(pct: number) {
    if (cycleIncome <= 0) return null;
    return Math.round((cycleIncome * pct) / 100);
  }

  function save() {
    if (total !== 100) return;
    const payload = {
      allocationNeeds: state.allocationNeeds,
      allocationWants: state.allocationWants,
      allocationSavings: state.allocationSavings,
    };
    startTransition(async () => {
      try {
        await updateAllocations(payload);
        track(AnalyticsEvents.ALLOCATION_MODIFIED, {
          previous_needs: initialAllocation.allocationNeeds,
          previous_wants: initialAllocation.allocationWants,
          previous_savings: initialAllocation.allocationSavings,
          new_needs: payload.allocationNeeds,
          new_wants: payload.allocationWants,
          new_savings: payload.allocationSavings,
          trigger: "settings",
        });
        toast.success(SETTINGS_ALLOCATIONS_SAVED);
        router.push("/settings/system");
        router.refresh();
      } catch (error) {
        toast.error(fromConvexError(error).message);
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col px-5 py-4 md:py-8">
      <BackLink
        href="/settings/system"
        className="text-[12.5px] text-mute hover:text-ink"
      >
        {SETTINGS_SYSTEM_HEADING}
      </BackLink>
      <h1 className="mt-3 font-serif text-[23px] font-medium text-ink">
        {SETTINGS_ALLOCATIONS_PAGE_TITLE}
      </h1>
      <p className="mt-1 text-[12.5px] text-mute-subtle">
        {SETTINGS_ALLOCATIONS_PAGE_BODY}
      </p>

      <div className="mt-5">
        <AllocationBar
          needs={state.allocationNeeds}
          wants={state.allocationWants}
          savings={state.allocationSavings}
        />
      </div>

      <div className="mt-5 flex flex-1 flex-col gap-3.5">
        {ENVELOPES.map((env) => {
          const pct = state[env.key];
          const cents = perCycleCents(pct);
          return (
            <div key={env.key} className="flex flex-col gap-1">
              <AllocationRow
                envKey={env.key}
                label={env.label}
                desc={
                  cents != null ? `${formatCents(cents)} por ciclo` : env.desc
                }
                barColor={env.barColor}
                value={pct}
                state={state}
                dispatch={(payload) =>
                  setState((prev) => ({ ...prev, ...payload }))
                }
              />
            </div>
          );
        })}

        {total === 100 ? (
          <div className="flex items-center gap-2 text-[12.5px] text-qp-deep">
            <span className="flex size-4 items-center justify-center rounded-full bg-qp-soft">
              <CheckMark size={10} strokeWidth={3.5} />
            </span>
            {SETTINGS_ALLOCATIONS_NEXT_CYCLE}
          </div>
        ) : (
          <div
            className="rounded-lg bg-danger-bg p-3 text-sm text-danger-ink"
            role="alert"
          >
            El reparto suma {total}%. Ajusta para que sea exactamente 100%.
          </div>
        )}
      </div>

      <Button
        className="mt-6 w-full"
        size="lg"
        disabled={total !== 100 || isPending}
        onClick={save}
      >
        {isPending ? "Guardando…" : SETTINGS_ALLOCATIONS_SAVE}
      </Button>
    </div>
  );
}
