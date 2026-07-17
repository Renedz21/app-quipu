"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { STEP_LABELS } from "../constants";

type Props = {
  currentStep: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  cta?: ReactNode;
  hint?: string;
};

export function OnboardingShell({
  currentStep,
  title,
  subtitle,
  children,
  onBack,
  cta,
  hint,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-4 py-10">
      {/* Header: logo + stepper */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex flex-col gap-[2.5px]">
            <span className="h-[2.5px] w-4 rounded-[2px] bg-primary" />
            <span className="h-[2.5px] w-[11px] rounded-[2px] bg-moss" />
            <span className="h-[2.5px] w-1.5 rounded-[2px] bg-clay" />
          </span>
          <span className="font-serif text-[18px] font-medium text-foreground">
            Quipu
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {STEP_LABELS.map((label, i) => {
            const step = i + 1;
            const isActive = step === currentStep;
            const isComplete = step < currentStep;
            return (
              <div key={step} className="flex items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-[22px] items-center justify-center rounded-full text-[11px] font-bold",
                      isComplete || isActive
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground",
                    )}
                  >
                    {isComplete ? (
                      <svg
                        width="8"
                        height="6"
                        viewBox="0 0 8 6"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M1 3l2 2 4-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      step
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[12.5px] font-semibold",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <span className="h-px w-[22px] bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Eyebrow + Title + Subtitle */}
      <div className="flex flex-col">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-clay">
          Paso {currentStep} de {STEP_LABELS.length}
        </span>
        <h1
          className="mt-2.5 font-serif text-[33px] font-medium leading-tight text-foreground"
          tabIndex={-1}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[15px] text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {children}

      {/* Footer nav */}
      <div className="mt-2 flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            ← Atrás
          </button>
        ) : hint ? (
          <span className="text-[13px] text-faint">{hint}</span>
        ) : (
          <div />
        )}
        {cta && <div>{cta}</div>}
      </div>
    </div>
  );
}
