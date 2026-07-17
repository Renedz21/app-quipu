"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";
import type { IncomeModel } from "../types";

const OPTIONS: { value: IncomeModel; title: string; description: string }[] = [
  {
    value: "fixed",
    title: "Trabajador dependiente",
    description: "Sueldo fijo en fechas conocidas.",
  },
  {
    value: "variable",
    title: "Trabajador independiente",
    description: "Ingresos variables por proyecto o venta.",
  },
  {
    value: "mixed",
    title: "Ingresos mixtos",
    description: "Una parte fija y otra variable.",
  },
];

const ICON_FOR: Record<IncomeModel, React.ReactNode> = {
  fixed: (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2" y="2" width="16" height="16" rx="4" className="fill-primary" />
    </svg>
  ),
  variable: (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle
        cx="10"
        cy="10"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-clay"
      />
    </svg>
  ),
  mixed: (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2" y="2" width="7" height="16" rx="2" className="fill-needs" />
      <rect x="11" y="2" width="7" height="16" rx="2" className="fill-clay" />
    </svg>
  ),
};

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

export function Step1IncomeProfile({ onNext }: { onNext: () => void }) {
  const { state, dispatch } = useOnboarding();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function handleSelect(value: IncomeModel) {
    dispatch({
      type: "UPDATE",
      payload: {
        incomeModel: value,
        payFrequency: value === "mixed" ? "monthly" : null,
        paydays: value === "mixed" ? [1] : [],
        cycleDurationDays: value === "variable" ? 30 : null,
      },
    });
  }

  return (
    <OnboardingShell
      currentStep={1}
      title="¿Cómo recibes tu dinero?"
      subtitle="Con esto Quipu arma tu ciclo. Podrás cambiarlo después."
      cta={
        <Button onClick={onNext} disabled={!state.incomeModel} size="lg">
          Continuar →
        </Button>
      }
      hint="Puedes cambiarlo cuando quieras"
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
              className={`flex items-center gap-4 rounded-[14px] py-[18px] pl-5 pr-5 text-left transition-colors ${
                selected
                  ? "border-[1.5px] border-primary bg-primary-soft"
                  : "border border-[#E7E3DC] bg-white hover:border-primary/50"
              }`}
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-qp-border bg-white">
                {ICON_FOR[opt.value]}
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
                {selected && <CheckMark />}
              </span>
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}
