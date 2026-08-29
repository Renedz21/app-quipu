"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AnalyticsEvents, track } from "@/core/analytics";
import { fromConvexError } from "@/core/errors";
import { parseToCents } from "@/shared/lib/money";
import {
  type Allocation,
  buildSimpleCorrectionPlan,
  computeFreeCents,
  type EnvelopeTargets,
  proposeRemainingByEnvelope,
  type SimpleCorrectionResult,
} from "../lib/simple-correction-plan";
import {
  type SimpleCorrectionWizardValues,
  simpleCorrectionWizardSchema,
} from "../lib/simple-correction-schema";
import { CycleCorrectViewSkeleton } from "./cycle-correct-view-skeleton";
import { WizardStepIncome } from "./wizard-step-income";
import { WizardStepReserved } from "./wizard-step-reserved";
import { WizardStepSplit } from "./wizard-step-split";

type Mode = SimpleCorrectionWizardValues["reservedMode"];
type NewCommitment = NonNullable<SimpleCorrectionWizardValues["newCommitment"]>;

const EMPTY_NEW_COMMITMENT: NewCommitment = {
  name: "",
  amountCents: 0,
  dueDay: 1,
  envelope: "needs",
};

const FALLBACK_ALLOCATION: Allocation = { needs: 50, wants: 30, savings: 20 };

export function CycleCorrectWizard() {
  const router = useRouter();
  const summary = useQuery(api.dashboard.getSummary, {});
  const settings = useQuery(api.settings.getSettingsOverview, {});
  const correct = useMutation(api.cycleCorrection.correctActiveCycleAllocation);
  const createCommitment = useMutation(
    api.fixedCommitments.createFixedCommitment,
  );

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [incomeText, setIncomeText] = useState("");
  const [reservedText, setReservedText] = useState("");
  const [reservedMode, setReservedMode] = useState<Mode>("existing");
  const [commitmentId, setCommitmentId] = useState("");
  const [newCommitment, setNewCommitment] =
    useState<NewCommitment>(EMPTY_NEW_COMMITMENT);
  const [targets, setTargets] = useState<EnvelopeTargets>({
    needs: 0,
    wants: 0,
    savings: 0,
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const startedTracked = useRef(false);

  useEffect(() => {
    if (!summary?.cycle || startedTracked.current) return;
    startedTracked.current = true;
    track(AnalyticsEvents.ALLOCATION_CORRECT_STARTED, {
      cycle_id: summary.cycle.id,
      needs_review: summary.cycle.needsReview === true,
    });
  }, [summary]);

  const currencyCode = summary?.profile.currencyCode ?? "PEN";
  const allocation = useMemo<Allocation>(
    () => settings?.allocations ?? FALLBACK_ALLOCATION,
    [settings],
  );

  const incomeCents = parseToCents(incomeText) ?? 0;
  const reservedCents = parseToCents(reservedText) ?? 0;

  const spentPerEnvelope = useMemo<EnvelopeTargets>(() => {
    const envelopes = summary?.envelopes ?? [];
    const spent = (type: "needs" | "wants" | "savings") => {
      const envelope = envelopes.find((e) => e.type === type);
      if (!envelope) return 0;
      return Math.max(
        0,
        (envelope.allocatedAmount ?? 0) - (envelope.remainingAmount ?? 0),
      );
    };
    return {
      needs: spent("needs"),
      wants: spent("wants"),
      savings: spent("savings"),
    };
  }, [summary]);

  const freeCents = computeFreeCents({
    incomeCents,
    reservedWithCommitmentCents: reservedMode === "generic" ? 0 : reservedCents,
    reservedGenericCents: reservedMode === "generic" ? reservedCents : 0,
  });

  if (summary === undefined || settings === undefined) {
    return <CycleCorrectViewSkeleton />;
  }
  if (summary === null || !summary.cycle) {
    return (
      <section className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-serif text-2xl text-ink">Corregir distribución</h1>
        <p className="mt-2 text-sm text-mute">
          Necesitas un ciclo activo para corregir cómo está repartido tu dinero.
        </p>
      </section>
    );
  }

  const activeCycle = summary.cycle;

  function startStep3() {
    setTargets(
      proposeRemainingByEnvelope({
        freeCents,
        allocation,
        spentPerEnvelope,
      }),
    );
    setStep(3);
  }

  function resetProposal() {
    setTargets(
      proposeRemainingByEnvelope({ freeCents, allocation, spentPerEnvelope }),
    );
  }

  async function apply() {
    setServerError(null);
    const parsed = simpleCorrectionWizardSchema.safeParse({
      incomeCents,
      reservedMode,
      reservedCents,
      commitmentId: commitmentId || undefined,
      newCommitment: reservedMode === "create" ? newCommitment : undefined,
      targets,
    });
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }
    setSaving(true);
    try {
      let effectiveCommitmentId = commitmentId;
      if (reservedMode === "create") {
        try {
          effectiveCommitmentId = await createCommitment({
            name: newCommitment.name,
            amount: newCommitment.amountCents,
            envelope: newCommitment.envelope,
            dueDay: newCommitment.dueDay,
          });
        } catch (error) {
          setServerError(fromConvexError(error).message);
          return;
        }
      }
      let plan: SimpleCorrectionResult;
      try {
        plan = buildSimpleCorrectionPlan({
          incomeCents,
          reservedWithCommitmentCents:
            reservedMode === "generic" ? 0 : reservedCents,
          reservedGenericCents: reservedMode === "generic" ? reservedCents : 0,
          commitmentId: effectiveCommitmentId,
          allocation,
          spentPerEnvelope,
          targets,
        });
      } catch (error) {
        setServerError(
          error instanceof Error ? error.message : "No se pudo armar el plan.",
        );
        return;
      }
      try {
        await correct({
          setEnvelopeRemaining: plan.remainingByEnvelope,
          setUnallocatedCents: plan.unallocatedCents,
          declaredLiquidCents: plan.declaredLiquidCents,
          reserveToCommitments: plan.reserveToCommitments.map((row) => ({
            commitmentId: row.commitmentId as Id<"fixedCommitments">,
            amountCents: row.amountCents,
          })),
          contributeToSavings: [],
          note: "Corrección guiada del ciclo",
        });
      } catch (error) {
        setServerError(fromConvexError(error).message);
        return;
      }
      track(AnalyticsEvents.ALLOCATION_CORRECT_COMPLETED, {
        cycle_id: activeCycle.id,
        needs_review_before: activeCycle.needsReview === true,
      });
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  const assigned = targets.needs + targets.wants + targets.savings;
  const spentCents =
    spentPerEnvelope.needs + spentPerEnvelope.wants + spentPerEnvelope.savings;
  const overAssigned = assigned > freeCents;
  const overrunWarning =
    spentPerEnvelope.needs > targets.needs ||
    spentPerEnvelope.wants > targets.wants ||
    spentPerEnvelope.savings > targets.savings
      ? "Ya gastaste más de lo que te tocaría en algún sobre; ese sobre queda en 0 y el resto se ajusta con lo que te queda."
      : null;

  return (
    <section className="mx-auto max-w-lg px-4 py-8">
      {step === 1 ? (
        <WizardStepIncome
          amountText={incomeText}
          currencyCode={currencyCode}
          onAmountChange={setIncomeText}
          onNext={() => setStep(2)}
        />
      ) : null}
      {step === 2 ? (
        <WizardStepReserved
          incomeCents={incomeCents}
          reservedText={reservedText}
          reservedMode={reservedMode}
          commitmentId={commitmentId}
          newCommitment={newCommitment}
          commitments={(summary.commitments ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            amount: c.amount,
          }))}
          currencyCode={currencyCode}
          onReservedChange={setReservedText}
          onModeChange={setReservedMode}
          onCommitmentChange={setCommitmentId}
          onNewCommitmentChange={setNewCommitment}
          onBack={() => setStep(1)}
          onNext={() => {
            setNewCommitment((current) => ({
              ...current,
              amountCents: reservedCents,
            }));
            startStep3();
          }}
        />
      ) : null}
      {step === 3 ? (
        <WizardStepSplit
          freeCents={freeCents}
          targets={targets}
          currencyCode={currencyCode}
          spentCents={spentCents}
          overrunWarning={overrunWarning}
          disabled={saving || overAssigned}
          onTargetChange={(key, cents) =>
            setTargets((current) => ({ ...current, [key]: cents }))
          }
          onResetProposal={resetProposal}
          onBack={() => setStep(2)}
          onSubmit={apply}
        />
      ) : null}
      {step === 3 && overAssigned ? (
        <p className="mt-2 text-[12px] text-danger-ink">
          Los sobres no pueden superar el dinero libre.
        </p>
      ) : null}
      {serverError ? (
        <p className="mt-2 text-sm text-danger-ink">{serverError}</p>
      ) : null}
    </section>
  );
}
