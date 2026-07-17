"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";
import type { IncomeModel } from "../types";

const OPTIONS: {
  value: IncomeModel;
  icon: React.ReactNode;
  title: string;
  description: string;
}[] = [
  {
    value: "fixed",
    icon: <span className="size-5 rounded-sm bg-primary" />,
    title: "Trabajador dependiente",
    description: "Sueldo fijo en fechas conocidas.",
  },
  {
    value: "variable",
    icon: <span className="size-5 rounded-full border-3 border-clay" />,
    title: "Trabajador independiente",
    description: "Ingresos variables por proyecto o venta.",
  },
  {
    value: "mixed",
    icon: (
      <span className="flex gap-1">
        <span className="w-2 rounded-[3px] bg-needs" />
        <span className="w-2 rounded-[3px] bg-clay" />
      </span>
    ),
    title: "Ingresos mixtos",
    description: "Una parte fija y otra variable.",
  },
];

export function Step1IncomeProfile() {
  const { state, dispatch } = useOnboarding();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function handleSelect(value: IncomeModel) {
    const reset: Partial<typeof state> = { incomeModel: value };
    if (value === "variable") {
      reset.payFrequency = undefined;
      reset.paydays = [];
      reset.cycleDurationDays = 30;
    } else if (value === "mixed") {
      reset.payFrequency = "monthly";
      reset.paydays = [1];
      reset.cycleDurationDays = null;
    } else {
      reset.payFrequency = null;
      reset.paydays = [];
      reset.cycleDurationDays = null;
    }
    dispatch({ type: "UPDATE", payload: reset });
  }

  function handleContinue() {
    if (!state.incomeModel) return;
    dispatch({ type: "SET_STEP", payload: 2 });
  }

  return (
    <OnboardingShell
      currentStep={1}
      title="¿Cómo recibes tu dinero?"
      subtitle="Con esto Quipu arma tu ciclo. Podrás cambiarlo después."
      cta={
        <Button onClick={handleContinue} disabled={!state.incomeModel} size="lg">
          Continuar →
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const selected = state.incomeModel === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(opt.value)}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-colors ${
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-qp-border bg-white">
                {opt.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{opt.title}</p>
                <p className="text-sm text-muted-foreground">{opt.description}</p>
              </div>
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
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
    </OnboardingShell>
  );
}
