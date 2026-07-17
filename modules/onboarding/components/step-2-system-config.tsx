"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";

const DAY_PILLS = [15, 30, "Ultimo"] as const;
const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

function formatCycle(day: number): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), day);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return `${start.getDate()} ${MONTHS[start.getMonth()]} → ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}

function CheckMark() {
  return (
    <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden="true">
      <path
        d="M1 3l2 2 4-4"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VariableBranch({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const { state, dispatch } = useOnboarding();
  return (
    <OnboardingShell
      currentStep={2}
      title="¿Cómo prefieres tus ciclos?"
      subtitle="Como tus ingresos varían, Quipu trabaja por ciclos fijos y reparte lo que va entrando."
      onBack={onBack}
      cta={
        <Button onClick={onNext} disabled={!state.cycleDurationDays} size="lg">
          Continuar →
        </Button>
      }
    >
      <div className="flex gap-3">
        {[15, 30].map((days) => {
          const selected = state.cycleDurationDays === days;
          return (
            <button
              key={days}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() =>
                dispatch({
                  type: "UPDATE",
                  payload: { cycleDurationDays: days as 15 | 30 },
                })
              }
              className={cn(
                "flex flex-1 flex-col rounded-xl border-2 p-5 text-left",
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:border-primary/50",
              )}
            >
              <p className="font-serif text-2xl text-foreground">
                {days} días
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {days === 15
                  ? "Ciclos cortos, ideal si cobras seguido."
                  : "Un mes completo para ver el panorama."}
              </p>
              <span
                className={cn(
                  "mt-3 flex size-5 items-center justify-center rounded-full self-start",
                  selected ? "bg-primary" : "border-2 border-border",
                )}
              >
                {selected && <CheckMark />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-soft p-4 text-sm text-muted-foreground">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
          i
        </span>
        <p>
          Cada ingreso que registres se reparte en tus sobres según tu
          porcentaje. Si un ciclo entra poco, Quipu te avisa con calma.
        </p>
      </div>
    </OnboardingShell>
  );
}

function MixedBranch({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const { state, dispatch } = useOnboarding();
  const mixedDay = state.paydays?.[0] ?? 1;
  return (
    <OnboardingShell
      currentStep={2}
      title="Combinemos lo fijo y lo variable"
      subtitle="Configura tu parte previsible; el resto entra cuando lo registres."
      onBack={onBack}
      cta={
        <Button onClick={onNext} size="lg">
          Continuar →
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="size-3 rounded-full bg-needs" />
            <p className="font-semibold">Ingreso previsible</p>
            <span className="text-xs text-muted-foreground">
              · sueldo, mensualidad
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">Monto</p>
              <p className="font-serif text-xl text-foreground">S/ —</p>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">Día de pago</p>
              <div className="flex flex-wrap gap-1.5">
                {DAY_PILLS.map((d) => {
                  const day = d === "Ultimo" ? 31 : d;
                  const selected = mixedDay === day;
                  return (
                    <button
                      key={String(d)}
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "UPDATE",
                          payload: { paydays: [day] },
                        })
                      }
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm",
                        selected
                          ? "border-primary bg-primary-soft font-semibold text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="size-3 rounded-full bg-clay" />
            <p className="font-semibold">Ingresos variables</p>
            <span className="text-xs text-muted-foreground">
              · proyectos, ventas
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Proyectos", "Ventas", "Servicios"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            <span className="rounded-full border border-dashed border-border bg-surface-soft px-3 py-1.5 text-sm text-muted-foreground">
              + Agregar
            </span>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

function FixedBranch({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const { state, dispatch } = useOnboarding();
  const isBiweekly = state.payFrequency === "biweekly";
  const cycleDays = isBiweekly ? 15 : 30;
  const payday = state.paydays?.[0] ?? 1;
  const preview = formatCycle(payday);
  const canContinue =
    !!state.payFrequency && state.paydays.length > 0;

  return (
    <OnboardingShell
      currentStep={2}
      title="¿Cada cuánto te pagan?"
      subtitle="Tu ciclo empieza el día que recibes tu sueldo."
      onBack={onBack}
      cta={
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continuar →
        </Button>
      }
    >
      <div className="flex gap-3">
        {(["monthly", "biweekly"] as const).map((freq) => {
          const selected = state.payFrequency === freq;
          return (
            <button
              key={freq}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() =>
                dispatch({
                  type: "UPDATE",
                  payload: {
                    payFrequency: freq,
                    paydays: freq === "biweekly" ? [1, 15] : [1],
                  },
                })
              }
              className={cn(
                "flex flex-1 items-center justify-between rounded-xl border-2 p-5 text-left",
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:border-primary/50",
              )}
            >
              <div>
                <p className="font-semibold">
                  {freq === "monthly" ? "Mensual" : "Quincenal"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {freq === "monthly" ? "Un pago al mes" : "Dos pagos al mes"}
                </p>
              </div>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  selected ? "bg-primary" : "border-2 border-border",
                )}
              >
                {selected && <CheckMark />}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-sm font-medium">Día de pago</p>
      <div className="flex flex-wrap gap-2">
        {DAY_PILLS.map((d) => {
          const day = d === "Ultimo" ? 31 : d;
          const selected = state.paydays?.includes(day);
          return (
            <button
              key={String(d)}
              type="button"
              onClick={() => {
                if (isBiweekly) {
                  const other =
                    state.paydays?.find(
                      (pd) => pd !== (state.paydays?.[0] ?? 1),
                    ) ?? 15;
                  if (day === other) return;
                  dispatch({
                    type: "UPDATE",
                    payload: { paydays: [day, other] },
                  });
                } else {
                  dispatch({ type: "UPDATE", payload: { paydays: [day] } });
                }
              }}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm",
                selected
                  ? "border-primary bg-primary-soft font-semibold text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>

      {state.paydays && state.paydays.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-soft p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tu ciclo
          </span>
          <span className="font-serif text-base text-foreground">
            {preview}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-sm text-primary">
            <span className="size-2 rounded-full bg-primary" />
            {cycleDays} días
          </span>
        </div>
      )}
    </OnboardingShell>
  );
}

export function Step2SystemConfig({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const { state } = useOnboarding();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  if (state.incomeModel === "variable") {
    return <VariableBranch onBack={onBack} onNext={onNext} />;
  }
  if (state.incomeModel === "mixed") {
    return <MixedBranch onBack={onBack} onNext={onNext} />;
  }
  return <FixedBranch onBack={onBack} onNext={onNext} />;
}
