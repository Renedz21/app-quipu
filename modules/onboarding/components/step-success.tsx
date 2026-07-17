"use client";

import Link from "next/link";
import { useOnboarding } from "./onboarding-provider";
import { MODEL_DISPLAY_LABELS, FREQ_DISPLAY_LABELS } from "../constants";

export function StepSuccess() {
  const { state } = useOnboarding();
  const cycleLabel =
    state.incomeModel === "variable"
      ? `Variable · ${state.cycleDurationDays} días`
      : `${FREQ_DISPLAY_LABELS[state.payFrequency ?? "monthly"]} · día ${
          state.paydays?.[0] ?? 1
        }`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-4 py-12">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
        <svg
          width="24"
          height="18"
          viewBox="0 0 24 18"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 9l7 7L22 3"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold">
          Tu sistema está listo
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Así queda tu Quipu. Todo esto lo puedes ajustar cuando quieras.
        </p>
      </div>

      <div className="flex w-full gap-3">
        <SummaryCard label="Perfil" value={MODEL_DISPLAY_LABELS[state.incomeModel ?? "fixed"]} />
        <SummaryCard label="Ciclo" value={cycleLabel} />
        <SummaryCard
          label="Reparto"
          value={
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="flex gap-0.5">
                <span className="size-2 rounded-full bg-needs" />
                <span className="size-2 rounded-full bg-clay" />
                <span className="size-2 rounded-full bg-moss" />
              </span>
              {state.allocationNeeds}/{state.allocationWants}/{state.allocationSavings}
            </div>
          }
        />
      </div>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Entrar a Quipu →
      </Link>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 font-semibold">{value}</div>
    </div>
  );
}
