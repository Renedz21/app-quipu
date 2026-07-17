"use client";

import type { ReactNode } from "react";
import { STEP_COUNT, STEP_LABELS } from "../constants";

type Props = {
  currentStep: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  backHref?: string;
  onBack?: () => void;
  cta?: ReactNode;
};

export function OnboardingShell({
  currentStep,
  title,
  subtitle,
  children,
  backHref,
  onBack,
  cta,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {STEP_LABELS.map((label, i) => {
            const step = i + 1;
            const isActive = step === currentStep;
            const isComplete = step < currentStep;
            return (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isComplete
                        ? "bg-primary text-primary-foreground"
                        : isActive
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground"
                    }`}
                  >
                    {isComplete ? (
                      <span className="inline-block w-[7px] -translate-y-px rotate-45 border-b-[2px] border-r-[2px] border-current" />
                    ) : (
                      step
                    )}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <span className="mx-1 h-px w-4 bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold" tabIndex={-1}>
          {title}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      {children}

      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Atrás
          </button>
        ) : (
          <div />
        )}
        {cta && <div>{cta}</div>}
      </div>
    </div>
  );
}
