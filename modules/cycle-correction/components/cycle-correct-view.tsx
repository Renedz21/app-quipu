"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AnalyticsEvents, setPersonProperties, track } from "@/core/analytics";
import { fromConvexError } from "@/core/errors";
import { parseToCents } from "@/shared/lib/money";
import {
  cycleCorrectFormReducer,
  INITIAL_CYCLE_CORRECT_FORM,
  moneyFromCents,
} from "../lib/cycle-correct-form-state";
import { CycleCorrectActions } from "./cycle-correct-actions";
import { CycleCorrectContributeSection } from "./cycle-correct-contribute-section";
import { CycleCorrectEnvelopeFields } from "./cycle-correct-envelope-fields";
import { CycleCorrectReserveSection } from "./cycle-correct-reserve-section";

export function CycleCorrectView() {
  const router = useRouter();
  const summary = useQuery(api.dashboard.getSummary, {});
  const correct = useMutation(api.cycleCorrection.correctActiveCycleAllocation);
  const [form, dispatch] = useReducer(
    cycleCorrectFormReducer,
    INITIAL_CYCLE_CORRECT_FORM,
  );
  const startedTracked = useRef(false);

  useEffect(() => {
    if (!summary?.cycle || startedTracked.current) return;
    startedTracked.current = true;
    track(AnalyticsEvents.ALLOCATION_CORRECT_STARTED, {
      cycle_id: summary.cycle.id,
      needs_review: summary.cycle.needsReview === true,
      reserved_cents: summary.hero?.reservedCents ?? 0,
      unallocated_cents: summary.cycle.unallocatedCents ?? 0,
    });
  }, [summary]);

  if (summary === undefined) {
    return <p className="p-6 text-sm text-mute">Cargando…</p>;
  }
  if (!summary?.cycle) {
    return (
      <section className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-serif text-2xl text-ink">Corregir distribución</h1>
        <p className="mt-2 text-sm text-mute">
          Necesitas un ciclo activo para corregir cómo está repartido tu dinero.
        </p>
      </section>
    );
  }

  // Adjust form when the active cycle loads (recommended React pattern vs effect).
  if (form.cycleId !== summary.cycle.id) {
    const envelopes = summary.envelopes ?? [];
    const needsEnv = envelopes.find((e) => e.type === "needs");
    const wantsEnv = envelopes.find((e) => e.type === "wants");
    const savingsEnv = envelopes.find((e) => e.type === "savings");
    if (needsEnv && wantsEnv && savingsEnv) {
      dispatch({
        type: "hydrate",
        cycleId: summary.cycle.id,
        needsText: moneyFromCents(needsEnv.remainingAmount),
        wantsText: moneyFromCents(wantsEnv.remainingAmount),
        savingsText: moneyFromCents(savingsEnv.remainingAmount),
        unallocatedText: moneyFromCents(summary.cycle.unallocatedCents ?? 0),
        selectedCommitmentId: summary.commitments[0]?.id ?? "",
      });
    }
  }

  const currencyCode = summary.profile.currencyCode;
  const needs = summary.envelopes.find((e) => e.type === "needs");
  const activeCycle = summary.cycle;

  function onSubmit() {
    dispatch({ type: "setServerError", message: null });
    const needsCents = parseToCents(form.needsText) ?? -1;
    const wantsCents = parseToCents(form.wantsText) ?? -1;
    const savingsCents = parseToCents(form.savingsText) ?? -1;
    const unallocatedCents = parseToCents(form.unallocatedText) ?? -1;
    const reserveCents = form.reserveText.trim()
      ? (parseToCents(form.reserveText) ?? -1)
      : 0;
    const contributeCents = form.contributeText.trim()
      ? (parseToCents(form.contributeText) ?? -1)
      : 0;

    if (
      [needsCents, wantsCents, savingsCents, unallocatedCents].some(
        (value) => value < 0,
      )
    ) {
      dispatch({
        type: "setServerError",
        message: "Revisa los montos de sobres y por repartir.",
      });
      return;
    }
    if (reserveCents < 0 || contributeCents < 0) {
      dispatch({ type: "setServerError", message: "Revisa reserva y aporte." });
      return;
    }

    const needsReviewBefore = activeCycle.needsReview === true;
    const cycleId = activeCycle.id;
    const contributeKind = form.contributeKind;

    dispatch({ type: "setSaving", saving: true });
    correct({
      setEnvelopeRemaining: {
        needs: needsCents,
        wants: wantsCents,
        savings: savingsCents,
      },
      setUnallocatedCents: unallocatedCents,
      reserveToCommitments:
        reserveCents > 0 && form.selectedCommitmentId
          ? [
              {
                commitmentId:
                  form.selectedCommitmentId as Id<"fixedCommitments">,
                amountCents: reserveCents,
              },
            ]
          : [],
      contributeToSavings:
        contributeCents > 0
          ? [{ amountCents: contributeCents, kind: contributeKind }]
          : [],
      note: "Corrección manual del ciclo",
    })
      .then(() => {
        track(AnalyticsEvents.ALLOCATION_CORRECT_COMPLETED, {
          cycle_id: cycleId,
          needs_review_before: needsReviewBefore,
          reserved_cents: reserveCents,
          unallocated_cents: unallocatedCents,
          contribute_cents: contributeCents,
          ...(contributeCents > 0 ? { contribute_kind: contributeKind } : {}),
        });
        setPersonProperties({
          allocation_needs_review: false,
          allocation_corrected_at: Date.now(),
        });
        router.push("/dashboard");
      })
      .catch((error: unknown) => {
        dispatch({
          type: "setServerError",
          message: fromConvexError(error).message,
        });
      })
      .finally(() => {
        dispatch({ type: "setSaving", saving: false });
      });
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 md:py-8">
      <header className="mb-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
          Ciclo activo
        </p>
        <h1 className="font-serif text-[23px] font-medium text-ink md:text-[27px]">
          Corregir distribución
        </h1>
        <p className="mt-1 text-[13px] text-mute-subtle">
          Indica cuánto puedes gastar, cuánto está reservado para deudas y
          cuánto ya ahorraste de verdad. No borramos tu historial: solo
          transferencias internas.
        </p>
      </header>

      <div className="space-y-4">
        <CycleCorrectEnvelopeFields
          needsText={form.needsText}
          wantsText={form.wantsText}
          savingsText={form.savingsText}
          unallocatedText={form.unallocatedText}
          needsRemainingCents={needs?.remainingAmount}
          currencyCode={currencyCode}
          dispatch={dispatch}
        />
        <CycleCorrectReserveSection
          commitments={summary.commitments}
          selectedCommitmentId={form.selectedCommitmentId}
          reserveText={form.reserveText}
          currencyCode={currencyCode}
          dispatch={dispatch}
        />
        <CycleCorrectContributeSection
          contributeKind={form.contributeKind}
          contributeText={form.contributeText}
          dispatch={dispatch}
        />
        <CycleCorrectActions
          saving={form.saving}
          serverError={form.serverError}
          onCancel={() => router.push("/dashboard")}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
