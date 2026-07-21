"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_CURRENCY } from "@/core/constants";
import { useDashboardSummary } from "@/modules/dashboard/hooks/use-dashboard-summary";
import { ExpenseKeypad } from "@/modules/expenses/components/expense-keypad";
import {
  formatKeypadDisplay,
  isKeypadAmountValid,
} from "@/modules/expenses/lib/keypad";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import {
  getIncomeSourceLabel,
  INCOME_AMOUNT_LABEL,
  INCOME_CANCEL_CTA,
  INCOME_CONCEPT_LABEL,
  INCOME_CONCEPT_OPTIONAL,
  INCOME_DATE_LABEL,
  INCOME_PAGE_SUBTITLE,
  INCOME_PAGE_TITLE,
  INCOME_SOURCE_LABEL,
  INCOME_SUBMIT_CTA,
} from "../constants";
import {
  computeImpactPreview,
  resolveCycleDaysForPreview,
} from "../lib/impactPreview";
import {
  buildIncomeDescription,
  formatIncomeDateLabel,
} from "../lib/incomeForm";
import type {
  IncomeFlowStep,
  IncomeRegisterResult,
  IncomeSource,
} from "../types";
import { IncomeConfirmation } from "./income-confirmation";
import { IncomeImpactPreview } from "./income-impact-preview";
import { IncomeSourceChips } from "./income-source-chips";

export function IncomeRegisterFlow() {
  const summary = useDashboardSummary();
  const profile = useQuery(api.profiles.getMyProfile, {});
  const createIncomeEvent = useMutation(api.incomeEvents.createIncomeEvent);

  const [step, setStep] = useState<IncomeFlowStep>("form");
  const [amountCents, setAmountCents] = useState(0);
  const [source, setSource] = useState<IncomeSource | null>("payroll");
  const [concept, setConcept] = useState("");
  const [occurredAt] = useState(() => Date.now());
  const [result, setResult] = useState<IncomeRegisterResult | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyCode =
    summary?.profile.currencyCode ??
    profile?.currencyCode ??
    DEFAULT_CURRENCY.code;
  const currencySymbol = DEFAULT_CURRENCY.symbol;

  const previewInput = useMemo(() => {
    if (!profile || amountCents <= 0) return null;

    const currentEnvelopes = {
      needs:
        summary?.envelopes.find((envelope) => envelope.type === "needs")
          ?.remainingAmount ?? 0,
      wants:
        summary?.envelopes.find((envelope) => envelope.type === "wants")
          ?.remainingAmount ?? 0,
      savings:
        summary?.envelopes.find((envelope) => envelope.type === "savings")
          ?.remainingAmount ?? 0,
    };

    const daysRemaining =
      summary?.cycle?.daysRemaining ??
      resolveCycleDaysForPreview({
        incomeModel: profile.incomeModel,
        payFrequency: profile.payFrequency,
        cycleDurationDays: profile.cycleDurationDays,
      });

    return computeImpactPreview({
      amountCents,
      weights: {
        allocationNeeds: profile.allocationNeeds,
        allocationWants: profile.allocationWants,
        allocationSavings: profile.allocationSavings,
      },
      currentEnvelopes,
      daysRemaining,
    });
  }, [amountCents, profile, summary?.cycle?.daysRemaining, summary?.envelopes]);

  const canSubmit =
    isKeypadAmountValid(amountCents) && source !== null && !isSubmitting;

  async function handleSubmit() {
    if (!source || !canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const description = buildIncomeDescription(
        getIncomeSourceLabel(source),
        concept,
      );
      const response = await createIncomeEvent({
        amount: amountCents,
        source,
        description,
        occurredAt,
      });
      setResult(response);
      setStep("success");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "No pudimos registrar el ingreso. Intenta de nuevo.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "success" && result) {
    return <IncomeConfirmation result={result} currencyCode={currencyCode} />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="font-serif text-[27px] font-medium text-ink md:text-[27px]">
          {INCOME_PAGE_TITLE}
        </h1>
        <p className="mt-1 text-[13.5px] text-mute">{INCOME_PAGE_SUBTITLE}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-7">
        <div className="space-y-5">
          <div>
            <p className="mb-2 block text-[12.5px] font-medium text-ink-secondary">
              {INCOME_AMOUNT_LABEL}
            </p>
            <div className="rounded-[14px] border border-line bg-card px-5 py-4">
              <p className="font-serif text-[34px] leading-none text-ink">
                {formatKeypadDisplay(amountCents, currencySymbol)}
              </p>
            </div>
            <div className="mt-3">
              <ExpenseKeypad
                amountCents={amountCents}
                onChange={setAmountCents}
              />
            </div>
          </div>

          <div>
            <p className="mb-2.5 block text-[12.5px] font-medium text-ink-secondary">
              {INCOME_SOURCE_LABEL}
            </p>
            <IncomeSourceChips value={source} onChange={setSource} />
          </div>

          <div>
            <p className="mb-2 block text-[12.5px] font-medium text-ink-secondary">
              {INCOME_DATE_LABEL}
            </p>
            <div className="flex h-[46px] max-w-[220px] items-center rounded-[11px] border border-line bg-card px-4 text-[14.5px] text-ink">
              {formatIncomeDateLabel(occurredAt)}
            </div>
          </div>

          <div>
            <label
              htmlFor="income-concept"
              className="mb-2 block text-[12.5px] font-medium text-ink-secondary"
            >
              {INCOME_CONCEPT_LABEL}{" "}
              <span className="font-normal text-mute">
                {INCOME_CONCEPT_OPTIONAL}
              </span>
            </label>
            <Input
              id="income-concept"
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
              placeholder="Ej. pago de cliente"
              className="h-[46px] rounded-[11px] border-line bg-card text-[14.5px]"
            />
          </div>
        </div>

        <IncomeImpactPreview
          preview={previewInput}
          currencyCode={currencyCode}
        />
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex h-[46px] rounded-[11px] border-line bg-card px-[22px] text-[14.5px] font-semibold text-mute hover:bg-surface-soft",
          )}
        >
          {INCOME_CANCEL_CTA}
        </Link>
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          className="h-[46px] rounded-[11px] bg-ink px-[26px] text-[14.5px] font-semibold text-canvas hover:bg-ink/90"
        >
          {isSubmitting ? "Registrando…" : INCOME_SUBMIT_CTA}
        </Button>
      </div>
    </div>
  );
}
