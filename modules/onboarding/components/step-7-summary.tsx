/**
 * Paso 7: Resumen final + submit.
 *
 * Muestra un resumen de todo lo configurado. El botón "Activar mi
 * copiloto" llama a `completeOnboardingAction` y, si éxito, avanza
 * al paso 8.
 *
 * UI:
 * - Cards de resumen: modelo ingresos, frecuencia, reparto, compromisos.
 * - Botón primary "Activar mi copiloto" con loading state.
 * - Error banner si falla la mutación.
 * - Botón "Saltar" no existe: el usuario ya pasó por todos los pasos;
 *   este es el confirm.
 */

"use client";

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { formatCents } from "@/shared/lib/money";
import { useOnboarding } from "./onboarding-provider";
import { INCOME_MODEL_LABELS, PAY_FREQUENCY_LABELS } from "../constants";
import { completeOnboardingAction } from "../actions";
import type { IncomeModel, PayFrequency } from "../types";

interface Step7SummaryProps {
  onAdvance: () => void;
}

export function Step7Summary({ onAdvance }: Step7SummaryProps) {
  const { state } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    const result = await completeOnboardingAction({
      name: state.name,
      incomeModel: state.incomeModel,
      payFrequency: state.payFrequency,
      paydays: state.paydays,
      allocationNeeds: state.allocationNeeds,
      allocationWants: state.allocationWants,
      allocationSavings: state.allocationSavings,
      commitments: state.commitments,
    });

    if (result.success) {
      // Limpiar storage local
      try {
        window.sessionStorage.removeItem("quipu:onboarding-state:v1");
      } catch {
        /* ignora */
      }
      onAdvance();
    } else {
      setError(result.error.message);
      setSubmitting(false);
    }
  }, [state, onAdvance]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1
        className="font-heading text-2xl font-semibold"
        data-step-heading
        tabIndex={-1}
      >
        Así se verá tu Quipu
      </h1>
      <p className="-mt-4 text-sm text-muted-foreground">
        Revisa que todo esté bien antes de activarlo.
      </p>

      {/* Resumen */}
      <div className="flex flex-col gap-3">
        <SummaryRow label="Nombre" value={state.name} />
        <SummaryRow
          label="Ingresos"
          value={
            state.incomeModel
              ? (INCOME_MODEL_LABELS[state.incomeModel as IncomeModel]?.title ??
                state.incomeModel)
              : "—"
          }
        />
        {state.payFrequency && (
          <SummaryRow
            label="Frecuencia"
            value={
              state.payFrequency === "variable"
                ? "Variable (lo apuntas tú)"
                : `${PAY_FREQUENCY_LABELS[state.payFrequency as PayFrequency]?.title ?? state.payFrequency} — Día${state.paydays.length > 1 ? "s" : ""} ${state.paydays.join(", ")}`
            }
          />
        )}
        <SummaryRow
          label="Reparto"
          value={`${state.allocationNeeds}% Necesidades · ${state.allocationWants}% Gustos · ${state.allocationSavings}% Ahorro`}
        />
        <SummaryRow
          label="Compromisos"
          value={
            state.commitments.length === 0
              ? "Ninguno (saltaste)"
              : `${state.commitments.length} compromiso${state.commitments.length > 1 ? "s" : ""}`
          }
        />
        {state.commitments.length > 0 && (
          <div className="flex flex-col gap-1.5 pl-3">
            {state.commitments.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{c.name}</span>
                <span className="font-medium tabular-nums">
                  {formatCents(c.amountCents)}/mes
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-2 rounded-xl bg-destructive-soft px-3 py-2.5 text-sm text-foreground"
          role="alert"
        >
          <span className="font-semibold text-destructive">{error}</span>
        </div>
      )}

      {/* CTA */}
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Button
          type="button"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting}
          className="h-12 w-full text-sm font-semibold"
        >
          {submitting ? (
            <>
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
              Creando tu Quipu…
            </>
          ) : (
            <>
              Activar mi copiloto
              <Sparkles className="size-4" data-icon="inline-end" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}
