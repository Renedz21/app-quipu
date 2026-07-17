"use client";

import { useRef, useEffect, useTransition } from "react";
import { Button } from "@/shared/components/ui/button";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";
import { completeOnboardingAction } from "../actions";

type Envelope = "allocationNeeds" | "allocationWants" | "allocationSavings";

const ENVELOPES: {
  key: Envelope;
  label: string;
  desc: string;
  barColor: string;
}[] = [
  {
    key: "allocationNeeds",
    label: "Necesidades",
    desc: "Alquiler, servicios, comida",
    barColor: "bg-needs",
  },
  {
    key: "allocationWants",
    label: "Gustos",
    desc: "Salidas, antojos, suscripciones",
    barColor: "bg-clay",
  },
  {
    key: "allocationSavings",
    label: "Ahorro",
    desc: "Fondo de emergencia y metas",
    barColor: "bg-moss",
  },
];

function adjustEnvelopes(
  state: {
    allocationNeeds: number;
    allocationWants: number;
    allocationSavings: number;
  },
  key: Envelope,
  delta: number,
) {
  const current = state[key];
  const newVal = Math.max(0, Math.min(100, current + delta));
  if (newVal === current) return null;

  const others = ENVELOPES.filter((e) => e.key !== key).map((e) => e.key);
  const o1 = state[others[0]!];
  const o2 = state[others[1]!];
  const diff = newVal - current;

  let n1: number;
  let n2: number;
  if (o1 > 0 && o2 > 0) {
    const ratio = o1 / (o1 + o2);
    const adj1 = Math.round(diff * ratio);
    n1 = Math.max(0, o1 - adj1);
    n2 = Math.max(0, o2 - (diff - adj1));
  } else if (o1 > 0) {
    n1 = Math.max(0, o1 - diff);
    n2 = o2;
  } else {
    n1 = o1;
    n2 = Math.max(0, o2 - diff);
  }

  return { [key]: newVal, [others[0]!]: n1, [others[1]!]: n2 };
}

export function Step3Allocation({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: () => void;
}) {
  const { state, dispatch } = useOnboarding();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const total =
    state.allocationNeeds + state.allocationWants + state.allocationSavings;

  function adjust(key: Envelope, delta: number) {
    const next = adjustEnvelopes(state, key, delta);
    if (next) dispatch({ type: "UPDATE", payload: next });
  }

  function handleSubmit() {
    if (total !== 100) return;
    startTransition(async () => {
      try {
        await completeOnboardingAction(state);
        onComplete();
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
      onBack={onBack}
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
                <p className="font-semibold">{env.label}</p>
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
            <svg width="6" height="5" viewBox="0 0 6 5" fill="none" aria-hidden="true">
              <path
                d="M1 2.5l1.5 1.5 2.5-3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Suma 100% · listo
        </div>
      ) : (
        <div
          className="rounded-lg bg-danger-bg p-3 text-sm text-danger-ink"
          role="alert"
        >
          El reparto suma {total}%. Ajusta para que sea exactamente 100% antes
          de continuar.
        </div>
      )}
    </OnboardingShell>
  );
}
