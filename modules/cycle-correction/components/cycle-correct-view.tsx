"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AnalyticsEvents, setPersonProperties, track } from "@/core/analytics";
import { fromConvexError } from "@/core/errors";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { formatCents, parseToCents } from "@/shared/lib/money";

type FormState = {
  cycleId: string | null;
  needsText: string;
  wantsText: string;
  savingsText: string;
  unallocatedText: string;
  reserveText: string;
  contributeText: string;
  contributeKind: "objective" | "additional";
  selectedCommitmentId: string;
  serverError: string | null;
  saving: boolean;
};

type FormAction =
  | {
      type: "hydrate";
      cycleId: string;
      needsText: string;
      wantsText: string;
      savingsText: string;
      unallocatedText: string;
      selectedCommitmentId: string;
    }
  | { type: "setField"; field: keyof FormState; value: string }
  | { type: "setContributeKind"; kind: "objective" | "additional" }
  | { type: "setServerError"; message: string | null }
  | { type: "setSaving"; saving: boolean };

const INITIAL_FORM: FormState = {
  cycleId: null,
  needsText: "",
  wantsText: "",
  savingsText: "",
  unallocatedText: "",
  reserveText: "",
  contributeText: "",
  contributeKind: "objective",
  selectedCommitmentId: "",
  serverError: null,
  saving: false,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "hydrate":
      if (state.cycleId === action.cycleId) return state;
      return {
        ...state,
        cycleId: action.cycleId,
        needsText: action.needsText,
        wantsText: action.wantsText,
        savingsText: action.savingsText,
        unallocatedText: action.unallocatedText,
        selectedCommitmentId: action.selectedCommitmentId,
        serverError: null,
      };
    case "setField":
      return { ...state, [action.field]: action.value };
    case "setContributeKind":
      return { ...state, contributeKind: action.kind };
    case "setServerError":
      return { ...state, serverError: action.message };
    case "setSaving":
      return { ...state, saving: action.saving };
    default:
      return state;
  }
}

function moneyFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function CycleCorrectView() {
  const router = useRouter();
  const summary = useQuery(api.dashboard.getSummary, {});
  const correct = useMutation(api.cycleCorrection.correctActiveCycleAllocation);
  const [form, dispatch] = useReducer(formReducer, INITIAL_FORM);
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
  const commitments = summary.commitments;
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
        <Field
          label="Disponible en Necesidades"
          value={form.needsText}
          onChange={(value) =>
            dispatch({ type: "setField", field: "needsText", value })
          }
          hint={
            needs
              ? `Ahora: ${formatCents(needs.remainingAmount, { currency: currencyCode })}`
              : undefined
          }
        />
        <Field
          label="Disponible en Gustos"
          value={form.wantsText}
          onChange={(value) =>
            dispatch({ type: "setField", field: "wantsText", value })
          }
        />
        <Field
          label="En sobre Ahorro (aún no en Fondo)"
          value={form.savingsText}
          onChange={(value) =>
            dispatch({ type: "setField", field: "savingsText", value })
          }
        />
        <Field
          label="Por repartir"
          value={form.unallocatedText}
          onChange={(value) =>
            dispatch({ type: "setField", field: "unallocatedText", value })
          }
        />

        <div className="rounded-[14px] border border-line bg-card p-4">
          <Label htmlFor="cycle-correct-commitment" className="text-[13px]">
            Reservar para un compromiso
          </Label>
          <select
            id="cycle-correct-commitment"
            aria-label="Compromiso a reservar"
            className="mt-2 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm"
            value={form.selectedCommitmentId}
            onChange={(event) =>
              dispatch({
                type: "setField",
                field: "selectedCommitmentId",
                value: event.target.value,
              })
            }
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
            aria-label="Monto a reservar"
            value={form.reserveText}
            onChange={(event) =>
              dispatch({
                type: "setField",
                field: "reserveText",
                value: event.target.value,
              })
            }
          />
        </div>

        <div className="rounded-[14px] border border-line bg-card p-4">
          <Label className="text-[13px]">Aportar al Fondo ahora</Label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={`rounded-md border px-3 py-1.5 text-[12.5px] ${
                form.contributeKind === "objective"
                  ? "border-qp bg-qp-panel text-qp-deep"
                  : "border-line"
              }`}
              onClick={() =>
                dispatch({ type: "setContributeKind", kind: "objective" })
              }
            >
              Hacia la meta
            </button>
            <button
              type="button"
              className={`rounded-md border px-3 py-1.5 text-[12.5px] ${
                form.contributeKind === "additional"
                  ? "border-qp bg-qp-panel text-qp-deep"
                  : "border-line"
              }`}
              onClick={() =>
                dispatch({ type: "setContributeKind", kind: "additional" })
              }
            >
              Adicional
            </button>
          </div>
          <Input
            className="mt-2"
            inputMode="decimal"
            placeholder="0.00"
            aria-label="Monto a aportar al Fondo"
            value={form.contributeText}
            onChange={(event) =>
              dispatch({
                type: "setField",
                field: "contributeText",
                value: event.target.value,
              })
            }
          />
        </div>

        {form.serverError ? (
          <p className="text-sm text-danger-ink">{form.serverError}</p>
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
            disabled={form.saving}
            onClick={() => onSubmit()}
          >
            {form.saving ? "Guardando…" : "Aplicar corrección"}
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
