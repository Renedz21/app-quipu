"use client";

import type { ReactNode } from "react";
import { ArrowRight, Briefcase, ChartTrend, Layers } from "reicon-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { INCOME_MODEL_OPTIONS } from "../constants";
import type { IncomeModel } from "../types";
import { CheckMark } from "./check-mark";
import { useOnboarding } from "./onboarding-provider";
import { OnboardingShell } from "./onboarding-shell";

type Props = {
  onNext: VoidFunction;
  onStepCompleted: VoidFunction;
};

export function Step1IncomeProfile({ onNext, onStepCompleted }: Props) {
  const { state, dispatch } = useOnboarding();

  function select(value: IncomeModel) {
    dispatch({
      type: "UPDATE",
      payload: {
        incomeModel: value,
        // Limpiar campos del modelo anterior al cambiar perfil.
        payFrequency: value === "mixed" ? "monthly" : null,
        paydays: value === "mixed" ? [1] : [],
        cycleDurationDays: value === "variable" ? 30 : undefined,
        mixedFixedAmount: undefined,
        variableIncomeSources: [],
      },
    });
  }

  function handleNext() {
    onStepCompleted();
    onNext();
  }

  return (
    <OnboardingShell
      currentStep={1}
      title="¿Cómo recibes tu dinero?"
      subtitle="Con esto Quipu arma tu ciclo. Podrás cambiarlo después."
      hint="Puedes cambiarlo cuando quieras"
      cta={
        <Button onClick={handleNext} disabled={!state.incomeModel} size="lg">
          Continuar
          <ArrowRight size={24} />
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {INCOME_MODEL_OPTIONS.map((opt) => {
          const selected = state.incomeModel === opt.value;
          return (
            <IncomeModelRow
              key={opt.value}
              icon={<IncomeModelIcon name={opt.iconName} />}
              title={opt.title}
              description={opt.description}
              selected={selected}
              onClick={() => select(opt.value)}
            />
          );
        })}
      </div>
    </OnboardingShell>
  );
}

function IncomeModelRow({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: VoidFunction;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-[14px] px-5 py-[18px] text-left transition-colors",
        selected
          ? "border-[1.5px] border-primary bg-primary-soft"
          : "border border-line-strong bg-surface hover:border-primary/50",
      )}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-qp-border bg-surface">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full",
          selected ? "bg-primary" : "border-2 border-border",
        )}
      >
        {selected && <CheckMark size={12} />}
      </span>
    </button>
  );
}

function IncomeModelIcon({
  name,
}: {
  name: "Briefcase" | "TrendingUp" | "Layers";
}) {
  if (name === "Briefcase") {
    return (
      <Briefcase size={20} color="var(--qp)" className="shrink-0" aria-hidden />
    );
  }
  if (name === "TrendingUp") {
    return (
      <ChartTrend
        size={20}
        color="var(--clay)"
        className="shrink-0"
        aria-hidden
      />
    );
  }
  return (
    <Layers size={20} color="var(--needs)" className="shrink-0" aria-hidden />
  );
}
