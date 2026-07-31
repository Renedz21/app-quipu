"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AnalyticsEvents, setPersonProperties, track } from "@/core/analytics";
import { fromConvexError } from "@/core/errors";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { formatCents, parseToCents } from "@/shared/lib/money";

export function CycleCorrectView() {
  const router = useRouter();
  const summary = useQuery(api.dashboard.getSummary, {});
  const correct = useMutation(api.cycleCorrection.correctActiveCycleAllocation);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const startedTracked = useRef(false);

  const [needsText, setNeedsText] = useState("");
  const [wantsText, setWantsText] = useState("");
  const [savingsText, setSavingsText] = useState("");
  const [unallocatedText, setUnallocatedText] = useState("");
  const [reserveText, setReserveText] = useState("");
  const [contributeText, setContributeText] = useState("");
  const [contributeKind, setContributeKind] = useState<
    "objective" | "additional"
  >("objective");
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string>("");

  useEffect(() => {
    if (!summary?.cycle || hydrated) return;
    const envelopes = summary.envelopes ?? [];
    const needs = envelopes.find((e) => e.type === "needs");
    const wants = envelopes.find((e) => e.type === "wants");
    const savings = envelopes.find((e) => e.type === "savings");
    if (!needs || !wants || !savings) return;
    setNeedsText((needs.remainingAmount / 100).toFixed(2));
    setWantsText((wants.remainingAmount / 100).toFixed(2));
    setSavingsText((savings.remainingAmount / 100).toFixed(2));
    setUnallocatedText(
      ((summary.cycle.unallocatedCents ?? 0) / 100).toFixed(2),
    );
    if (summary.commitments[0]) {
      setSelectedCommitmentId(summary.commitments[0].id);
    }
    setHydrated(true);
  }, [summary, hydrated]);

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

  const currencyCode = summary.profile.currencyCode;
  const commitments = summary.commitments;
  const needs = summary.envelopes.find((e) => e.type === "needs");

  async function onSubmit() {
    setServerError(null);
    const needsCents = parseToCents(needsText) ?? -1;
    const wantsCents = parseToCents(wantsText) ?? -1;
    const savingsCents = parseToCents(savingsText) ?? -1;
    const unallocatedCents = parseToCents(unallocatedText) ?? -1;
    const reserveCents = reserveText.trim()
      ? (parseToCents(reserveText) ?? -1)
      : 0;
    const contributeCents = contributeText.trim()
      ? (parseToCents(contributeText) ?? -1)
      : 0;

    if (
      [needsCents, wantsCents, savingsCents, unallocatedCents].some(
        (value) => value < 0,
      )
    ) {
      setServerError("Revisa los montos de sobres y por repartir.");
      return;
    }
    if (reserveCents < 0 || contributeCents < 0) {
      setServerError("Revisa reserva y aporte.");
      return;
    }

    setSaving(true);
    try {
      const needsReviewBefore = summary?.cycle?.needsReview === true;
      const cycleId = summary?.cycle?.id;
      await correct({
        setEnvelopeRemaining: {
          needs: needsCents,
          wants: wantsCents,
          savings: savingsCents,
        },
        setUnallocatedCents: unallocatedCents,
        reserveToCommitments:
          reserveCents > 0 && selectedCommitmentId
            ? [
                {
                  commitmentId: selectedCommitmentId as Id<"fixedCommitments">,
                  amountCents: reserveCents,
                },
              ]
            : [],
        contributeToSavings:
          contributeCents > 0
            ? [{ amountCents: contributeCents, kind: contributeKind }]
            : [],
        note: "Corrección manual del ciclo",
      });
      if (cycleId) {
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
      }
      router.push("/dashboard");
    } catch (error) {
      setServerError(fromConvexError(error).message);
    } finally {
      setSaving(false);
    }
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
        <Field
          label="Disponible en Necesidades"
          value={needsText}
          onChange={setNeedsText}
          hint={
            needs
              ? `Ahora: ${formatCents(needs.remainingAmount, { currency: currencyCode })}`
              : undefined
          }
        />
        <Field
          label="Disponible en Gustos"
          value={wantsText}
          onChange={setWantsText}
        />
        <Field
          label="En sobre Ahorro (aún no en Fondo)"
          value={savingsText}
          onChange={setSavingsText}
        />
        <Field
          label="Por repartir"
          value={unallocatedText}
          onChange={setUnallocatedText}
        />

        <div className="rounded-[14px] border border-line bg-card p-4">
          <Label className="text-[13px]">Reservar para un compromiso</Label>
          <select
            className="mt-2 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm"
            value={selectedCommitmentId}
            onChange={(event) => setSelectedCommitmentId(event.target.value)}
          >
            <option value="">Sin reserva nueva</option>
            {commitments.map((commitment) => (
              <option key={commitment.id} value={commitment.id}>
                {commitment.name} ·{" "}
                {formatCents(commitment.amount, { currency: currencyCode })}
              </option>
            ))}
          </select>
          <Input
            className="mt-2"
            inputMode="decimal"
            placeholder="0.00"
            value={reserveText}
            onChange={(event) => setReserveText(event.target.value)}
          />
        </div>

        <div className="rounded-[14px] border border-line bg-card p-4">
          <Label className="text-[13px]">Aportar al Fondo ahora</Label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={`rounded-md border px-3 py-1.5 text-[12.5px] ${
                contributeKind === "objective"
                  ? "border-qp bg-qp-panel text-qp-deep"
                  : "border-line"
              }`}
              onClick={() => setContributeKind("objective")}
            >
              Hacia la meta
            </button>
            <button
              type="button"
              className={`rounded-md border px-3 py-1.5 text-[12.5px] ${
                contributeKind === "additional"
                  ? "border-qp bg-qp-panel text-qp-deep"
                  : "border-line"
              }`}
              onClick={() => setContributeKind("additional")}
            >
              Adicional
            </button>
          </div>
          <Input
            className="mt-2"
            inputMode="decimal"
            placeholder="0.00"
            value={contributeText}
            onChange={(event) => setContributeText(event.target.value)}
          />
        </div>

        {serverError ? (
          <p className="text-sm text-danger-ink">{serverError}</p>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/dashboard")}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={saving}
            onClick={() => void onSubmit()}
          >
            {saving ? "Guardando…" : "Aplicar corrección"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <Label className="text-[13px]">{label}</Label>
      {hint ? <p className="mt-0.5 text-[11px] text-mute">{hint}</p> : null}
      <Input
        className="mt-1.5"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
