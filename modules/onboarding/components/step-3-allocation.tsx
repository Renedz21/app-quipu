"use client";

import { useRef, useEffect, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";
import { useTransition } from "react";
import { completeOnboardingAction } from "../actions";

type Envelope = "allocationNeeds" | "allocationWants" | "allocationSavings";

const ENVELOPES: {
  key: Envelope;
  label: string;
  desc: string;
  color: string;
  barColor: string;
}[] = [
  {
    key: "allocationNeeds",
    label: "Necesidades",
    desc: "Alquiler, servicios, comida",
    color: "text-needs",
    barColor: "bg-needs",
  },
  {
    key: "allocationWants",
    label: "Gustos",
    desc: "Salidas, antojos, suscripciones",
    color: "text-clay",
    barColor: "bg-clay",
  },
  {
    key: "allocationSavings",
    label: "Ahorro",
    desc: "Fondo de emergencia y metas",
    color: "text-moss",
    barColor: "bg-moss",
  },
];

export function Step3Allocation() {
  const { state, dispatch } = useOnboarding();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const total =
    state.allocationNeeds + state.allocationWants + state.allocationSavings;

  function handleBack() {
    dispatch({ type: "SET_STEP", payload: 2 });
  }

  const adjust = useCallback(
    (key: Envelope, delta: number) => {
      const current = state[key];
      const newVal = Math.max(0, Math.min(100, current + delta));
      if (newVal === current) return;

      const others = ENVELOPES.filter((e) => e.key !== key).map((e) => e.key);
      const diff = newVal - current;
      const other1 = state[others[0]!];
      const other2 = state[others[1]!];

      let n1: number;
      let n2: number;

      if (other1 > 0 && other2 > 0) {
        const ratio = other1 / (other1 + other2);
        const adjust1 = Math.round(diff * ratio);
        const adjust2 = diff - adjust1;
        n1 = Math.max(0, other1 - adjust1);
        n2 = Math.max(0, other2 - adjust2);
      } else if (other1 > 0) {
        n1 = Math.max(0, other1 - diff);
        n2 = other2;
      } else {
        n1 = other1;
        n2 = Math.max(0, other2 - diff);
      }

      const overflow1 = n1 - 100;
      const overflow2 = n2 - 100;
      if (overflow1 > 0) {
        n1 = 100;
        n2 = Math.max(0, n2 + overflow1);
      }
      if (overflow2 > 0) {
        n2 = 100;
        n1 = Math.max(0, n1 + overflow2);
      }

      dispatch({
        type: "UPDATE",
        payload: { [key]: newVal, [others[0]!]: n1, [others[1]!]: n2 },
      });
    },
    [state, dispatch],
  );

  function handleSubmit() {
    if (total !== 100) return;
    startTransition(async () => {
      try {
        await completeOnboardingAction(state);
      } catch {
        // error handled by fromConvexError
      }
    });
  }

  return (
    <OnboardingShell
      currentStep={3}
      title="¿Cómo repartes lo que entra?"
      subtitle="La regla 50/30/20 es un buen punto de partida. Ajusta si lo necesitas."
      onBack={handleBack}
      cta={
        <Button
          onClick={handleSubmit}
          disabled={total !== 100 || isPending}
          size="lg"
        >
          {isPending ? "Creando sistema…" : "Crear mi sistema →"}
        </Button>
      }
    >
      <div className="flex h-4 overflow-hidden rounded-lg ring-1 ring-inset ring-black/5">
        <div
          className="bg-needs transition-all"
          style={{ width: `${state.allocationNeeds}%` }}
        />
        <div
          className="bg-clay transition-all"
          style={{ width: `${state.allocationWants}%` }}
        />
        <div
          className="bg-moss transition-all"
          style={{ width: `${state.allocationSavings}%` }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {ENVELOPES.map((env) => {
          const value = state[env.key];
          return (
            <div key={env.key} className="flex items-center gap-4">
              <span
                className={`size-3 shrink-0 rounded-full ${env.barColor}`}
              />
              <div className="flex-1">
                <p className="font-semibold text-foreground">{env.label}</p>
                <p className="text-xs text-muted-foreground">{env.desc}</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-1">
                <button
                  type="button"
                  onClick={() => adjust(env.key, -5)}
                  className="flex size-7 items-center justify-center rounded-md bg-surface text-muted-foreground hover:text-foreground"
                  aria-label={`Reducir ${env.label}`}
                >
                  −
                </button>
                <span className="font-serif min-w-[3rem] text-center text-lg text-foreground">
                  {value}%
                </span>
                <button
                  type="button"
                  onClick={() => adjust(env.key, 5)}
                  className="flex size-7 items-center justify-center rounded-md bg-surface text-muted-foreground hover:text-foreground"
                  aria-label={`Aumentar ${env.label}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {total === 100 ? (
        <div className="flex items-center gap-2 text-sm text-primary">
          <span className="flex size-4 items-center justify-center rounded-full bg-primary-soft">
            <span className="inline-block w-[5px] -translate-y-px rotate-45 border-b-[2px] border-r-[2px] border-primary" />
          </span>
          Suma 100% · listo
        </div>
      ) : (
        <div className="rounded-lg bg-danger-bg p-3 text-sm text-danger-ink" role="alert">
          El reparto suma {total}%. Ajusta para que sea exactamente 100% antes de continuar.
        </div>
      )}
    </OnboardingShell>
  );
}
