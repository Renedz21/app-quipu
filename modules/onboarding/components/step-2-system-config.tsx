"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";
import { step2Schema } from "../schemas";

const DAY_OPTIONS = [15, 30, "Último", "Otro…"] as const;
const MONTH_NAMES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatCycle(startDay: number, endDay: number): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), startDay);
  const end = new Date(now.getFullYear(), now.getMonth(), endDay);
  if (end <= start) end.setMonth(end.getMonth() + 1);
  return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} → ${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
}

export function Step2SystemConfig() {
  const { state, dispatch } = useOnboarding();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const result = step2Schema.safeParse({
    payFrequency: state.payFrequency,
    paydays: state.paydays,
    cycleDurationDays: state.cycleDurationDays,
  });
  const isValid = result.success;

  function handleBack() {
    dispatch({ type: "SET_STEP", payload: 1 });
  }

  function handleContinue() {
    if (!isValid) return;
    dispatch({ type: "SET_STEP", payload: 3 });
  }

  if (state.incomeModel === "variable") {
    return (
      <OnboardingShell
        currentStep={2}
        title="¿Cómo prefieres tus ciclos?"
        subtitle="Como tus ingresos varían, Quipu trabaja por ciclos fijos y reparte lo que va entrando."
        onBack={handleBack}
        cta={
          <Button onClick={handleContinue} disabled={!state.cycleDurationDays} size="lg">
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
                    payload: {
                      cycleDurationDays: days as 15 | 30,
                      payFrequency: undefined,
                      paydays: [],
                    },
                  })
                }
                className={`flex-1 rounded-xl border-2 p-5 text-left ${
                  selected
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <p className="font-serif text-2xl text-foreground">{days} días</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {days === 15
                    ? "Ciclos cortos, ideal si cobras seguido."
                    : "Un mes completo para ver el panorama."}
                </p>
                <span
                  className={`mt-3 flex size-5 items-center justify-center rounded-full ${
                    selected ? "bg-primary" : "border-2 border-border"
                  }`}
                >
                  {selected && (
                    <span className="inline-block w-[5px] -translate-y-px rotate-45 border-b-[2px] border-r-[2px] border-white" />
                  )}
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

  if (state.incomeModel === "mixed") {
    return (
      <OnboardingShell
        currentStep={2}
        title="Combinemos lo fijo y lo variable"
        subtitle="Configura tu parte previsible; el resto entra cuando lo registres."
        onBack={handleBack}
        cta={
          <Button onClick={handleContinue} size="lg">
            Continuar →
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="size-3 rounded-full bg-needs" />
              <p className="font-semibold text-foreground">Ingreso previsible</p>
              <span className="text-xs text-muted-foreground">· sueldo, mensualidad</span>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground">Monto</p>
                <p className="font-serif text-xl text-foreground">S/ —</p>
              </div>
              <div className="flex-1 rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground">Día de pago</p>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_OPTIONS.map((d) => {
                    const selected =
                      typeof d === "number"
                        ? state.paydays?.includes(d)
                        : d === "Último"
                          ? state.paydays?.includes(31)
                          : false;
                    return (
                      <button
                        key={String(d)}
                        type="button"
                        onClick={() => {
                          const day = d === "Último" ? 31 : typeof d === "number" ? d : 1;
                          dispatch({
                            type: "UPDATE",
                            payload: { paydays: [day], payFrequency: "monthly" as const },
                          });
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-sm ${
                          selected
                            ? "border-primary bg-primary-soft font-semibold text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
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
              <p className="font-semibold text-foreground">Ingresos variables</p>
              <span className="text-xs text-muted-foreground">· proyectos, ventas</span>
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

  const isBiweekly = state.payFrequency === "biweekly";
  const cycleDays = isBiweekly ? 15 : 30;
  const preview = formatCycle(
    state.paydays?.[0] ?? 1,
    isBiweekly ? state.paydays?.[1] ?? 15 : state.paydays?.[0] ?? 1,
  );

  return (
    <OnboardingShell
      currentStep={2}
      title="¿Cada cuánto te pagan?"
      subtitle="Tu ciclo empieza el día que recibes tu sueldo."
      onBack={handleBack}
      cta={
        <Button onClick={handleContinue} disabled={!isValid} size="lg">
          Continuar →
        </Button>
      }
    >
      <div className="flex gap-3">
        {[
          {
            value: "monthly" as const,
            label: "Mensual",
            sub: "Un pago al mes",
          },
          {
            value: "biweekly" as const,
            label: "Quincenal",
            sub: "Dos pagos al mes",
          },
        ].map((opt) => {
          const selected = state.payFrequency === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                const days = opt.value === "biweekly" ? [1, 15] : [1];
                dispatch({
                  type: "UPDATE",
                  payload: { payFrequency: opt.value, paydays: days },
                });
              }}
              className={`flex-1 rounded-xl border-2 p-5 text-left ${
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{opt.label}</p>
                <span
                  className={`flex size-5 items-center justify-center rounded-full ${
                    selected ? "bg-primary" : "border-2 border-border"
                  }`}
                >
                  {selected && (
                    <span className="inline-block w-[5px] -translate-y-px rotate-45 border-b-[2px] border-r-[2px] border-white" />
                  )}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{opt.sub}</p>
            </button>
          );
        })}
      </div>

      <p className="text-sm font-medium text-foreground">Día de pago</p>
      <div className="flex flex-wrap gap-2">
        {DAY_OPTIONS.map((d) => {
          const selected =
            typeof d === "number"
              ? state.payFrequency === "biweekly"
                ? state.paydays?.includes(d)
                : state.paydays?.[0] === d
              : false;
          return (
            <button
              key={String(d)}
              type="button"
              onClick={() => {
                if (state.payFrequency === "biweekly") {
                  const day = typeof d === "number" ? d : 31;
                  const other = state.paydays?.find((pd) => pd !== (state.paydays?.[0] ?? 1)) ?? 15;
                  if (day === other) return;
                  dispatch({
                    type: "UPDATE",
                    payload: { paydays: state.payFrequency === "biweekly" ? [day, other] : [day] },
                  });
                } else if (d === "Último") {
                  dispatch({ type: "UPDATE", payload: { paydays: [31] } });
                } else if (d === "Otro…") {
                  dispatch({ type: "UPDATE", payload: { paydays: [1] } });
                } else if (typeof d === "number") {
                  dispatch({ type: "UPDATE", payload: { paydays: [d] } });
                }
              }}
              className={`rounded-lg border px-4 py-2 text-sm ${
                selected
                  ? "border-primary bg-primary-soft font-semibold text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {state.payFrequency && state.paydays.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-soft p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tu ciclo
          </span>
          <span className="font-serif text-base text-foreground">{preview}</span>
          <span className="ml-auto flex items-center gap-1.5 text-sm text-primary">
            <span className="size-2 rounded-full bg-primary" />
            {cycleDays} días
          </span>
        </div>
      )}
    </OnboardingShell>
  );
}
