"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";
import { CheckMark } from "./check-mark";
import { completeOnboardingAction } from "../actions";
import { ENVELOPES, type EnvelopeKey } from "../constants";

type Props = { onBack: () => void; onComplete: () => void };

export function Step3Allocation({ onBack, onComplete }: Props) {
  const { state, dispatch } = useOnboarding();
  const [isPending, startTransition] = useTransition();

  const total =
    state.allocationNeeds + state.allocationWants + state.allocationSavings;

  function submit() {
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
          onClick={submit}
          disabled={total !== 100 || isPending}
          size="lg"
        >
          {isPending ? "Creando sistema…" : "Crear mi sistema →"}
        </Button>
      }
    >
      <AllocationBar state={state} />

      <div className="flex flex-col gap-3">
        {ENVELOPES.map((env) => (
          <AllocationRow
            key={env.key}
            keyName={env.key}
            label={env.label}
            desc={env.desc}
            barColor={env.barColor}
            value={state[env.key]}
            onAdjust={(delta) => dispatchEnvelope(state, env.key, delta, dispatch)}
          />
        ))}
      </div>

      {total === 100 ? (
        <div className="flex items-center gap-2 text-sm text-primary">
          <span className="flex size-4 items-center justify-center rounded-full bg-primary-soft">
            <CheckMark size={10} strokeWidth={3.5} />
          </span>
          Suma 100% · listo
        </div>
      ) : (
        <div className="rounded-lg bg-danger-bg p-3 text-sm text-danger-ink" role="alert">
          El reparto suma {total}%. Ajusta para que sea exactamente 100% antes
          de continuar.
        </div>
      )}
    </OnboardingShell>
  );
}

function AllocationBar({
  state,
}: {
  state: { allocationNeeds: number; allocationWants: number; allocationSavings: number };
}) {
  return (
    <div className="flex h-4 overflow-hidden rounded-lg ring-1 ring-inset ring-black/5">
      <div className="bg-needs transition-all" style={{ width: `${state.allocationNeeds}%` }} />
      <div className="bg-clay transition-all" style={{ width: `${state.allocationWants}%` }} />
      <div className="bg-moss transition-all" style={{ width: `${state.allocationSavings}%` }} />
    </div>
  );
}

function AllocationRow({
  keyName,
  label,
  desc,
  barColor,
  value,
  onAdjust,
}: {
  keyName: EnvelopeKey;
  label: string;
  desc: string;
  barColor: string;
  value: number;
  onAdjust: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className={cn("size-3 shrink-0 rounded-full", barColor)} />
      <div className="flex-1">
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => onAdjust(-5)}
          className="flex size-7 items-center justify-center rounded-md bg-surface text-muted-foreground hover:text-foreground"
          aria-label={`Reducir ${label}`}
        >
          −
        </button>
        <span className="font-serif min-w-[3rem] text-center text-lg text-foreground">
          {value}%
        </span>
        <button
          type="button"
          onClick={() => onAdjust(5)}
          className="flex size-7 items-center justify-center rounded-md bg-surface text-muted-foreground hover:text-foreground"
          aria-label={`Aumentar ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function dispatchEnvelope(
  state: { allocationNeeds: number; allocationWants: number; allocationSavings: number },
  key: EnvelopeKey,
  delta: number,
  dispatch: React.Dispatch<{ type: "UPDATE"; payload: Partial<typeof state> }>,
) {
  const current = state[key];
  const newVal = Math.max(0, Math.min(100, current + delta));
  if (newVal === current) return;

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

  dispatch({ type: "UPDATE", payload: { [key]: newVal, [others[0]!]: n1, [others[1]!]: n2 } });
}
