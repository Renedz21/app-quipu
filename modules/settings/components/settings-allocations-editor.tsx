"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { fromConvexError } from "@/core/errors";
import { AllocationBar } from "@/modules/onboarding/components/allocation-bar";
import { AllocationRow } from "@/modules/onboarding/components/allocation-row";
import { CheckMark } from "@/modules/onboarding/components/check-mark";
import { ENVELOPES } from "@/modules/onboarding/constants";
import type { Allocation } from "@/modules/onboarding/lib/allocation";
import { Button } from "@/shared/components/ui/button";
import { formatCents } from "@/shared/lib/money";
import {
  SETTINGS_ALLOCATIONS_NEXT_CYCLE,
  SETTINGS_ALLOCATIONS_PAGE_BODY,
  SETTINGS_ALLOCATIONS_PAGE_TITLE,
  SETTINGS_ALLOCATIONS_SAVE,
  SETTINGS_ALLOCATIONS_SAVED,
  SETTINGS_BACK_LINK,
} from "../constants";

export function SettingsAllocationsEditor() {
  const router = useRouter();
  const profile = useQuery(api.profiles.getMyProfile, {});
  const summary = useQuery(api.dashboard.getSummary, {});
  const updateAllocations = useMutation(api.settings.updateAllocations);
  const [state, setState] = useState<Allocation | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (profile && !state) {
      setState({
        allocationNeeds: profile.allocationNeeds,
        allocationWants: profile.allocationWants,
        allocationSavings: profile.allocationSavings,
      });
    }
  }, [profile, state]);

  if (profile === undefined || state === null) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col px-5 py-6">
        <div className="h-4 w-24 animate-pulse rounded bg-line" />
        <div className="mt-4 h-8 w-48 animate-pulse rounded bg-line" />
      </div>
    );
  }

  if (profile === null) {
    return null;
  }

  const total =
    state.allocationNeeds + state.allocationWants + state.allocationSavings;
  const cycleIncome =
    summary?.envelopes?.reduce((sum, env) => sum + env.allocatedAmount, 0) ?? 0;

  function perCycleCents(pct: number) {
    if (cycleIncome <= 0) return null;
    return Math.round((cycleIncome * pct) / 100);
  }

  function save() {
    if (total !== 100 || !state) return;
    const payload = {
      allocationNeeds: state.allocationNeeds,
      allocationWants: state.allocationWants,
      allocationSavings: state.allocationSavings,
    };
    startTransition(async () => {
      try {
        await updateAllocations(payload);
        toast.success(SETTINGS_ALLOCATIONS_SAVED);
        router.push("/settings");
        router.refresh();
      } catch (error) {
        toast.error(fromConvexError(error).message);
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col px-5 py-4 md:py-8">
      <Link href="/settings" className="text-[12.5px] text-mute hover:text-ink">
        {SETTINGS_BACK_LINK}
      </Link>
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
                  setState((prev) => (prev ? { ...prev, ...payload } : prev))
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
