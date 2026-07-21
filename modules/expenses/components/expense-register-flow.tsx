"use client";

import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_CURRENCY } from "@/core/constants";
import { ENVELOPE_LABELS } from "@/modules/dashboard/constants";
import { useDashboardSummary } from "@/modules/dashboard/hooks/use-dashboard-summary";
import { Button } from "@/shared/components/ui/button";
import {
  EXPENSE_AMOUNT_LABEL,
  EXPENSE_FLOW_TITLE,
  EXPENSE_NEXT_CTA,
  EXPENSE_VARIANT_B_TITLE_PREFIX,
} from "../constants";
import { useExpenseRegister } from "../hooks/use-expense-register-context";
import {
  type ExpenseEnvelopeType,
  extractRecentExpenseEnvelopes,
  suggestEnvelope,
} from "../lib/envelopeSuggestion";
import { formatKeypadDisplay, isKeypadAmountValid } from "../lib/keypad";
import type { ExpenseFlowStep, ExpenseRegisterResult } from "../types";
import { ExpenseConfirmation } from "./expense-confirmation";
import { ExpenseEnvelopeStep } from "./expense-envelope-step";
import { ExpenseKeypad } from "./expense-keypad";
import { ExpenseRegisterShell, FlowProgress } from "./expense-register-shell";
import { ExpenseVariantBForm } from "./expense-variant-b-form";

function createInitialEnvelope(
  variant: "fab" | "envelope",
  preselected?: ExpenseEnvelopeType,
): ExpenseEnvelopeType {
  if (variant === "envelope" && preselected) return preselected;
  return "wants";
}

export function ExpenseRegisterFlow() {
  const { isOpen, close, options } = useExpenseRegister();
  const summary = useDashboardSummary();
  const registerExpense = useMutation(api.expenses.registerExpense);

  const [step, setStep] = useState<ExpenseFlowStep>("amount");
  const [amountCents, setAmountCents] = useState(0);
  const [selectedEnvelope, setSelectedEnvelope] =
    useState<ExpenseEnvelopeType>("wants");
  const [description, setDescription] = useState("");
  const [startedAt, setStartedAt] = useState(Date.now());
  const [result, setResult] = useState<ExpenseRegisterResult | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const variant = options.variant ?? "fab";
  const preselectedEnvelope = options.preselectedEnvelope;
  const hasActiveCycle = Boolean(summary?.cycle);

  const resetFlow = useCallback(() => {
    setStep("amount");
    setAmountCents(0);
    setSelectedEnvelope(createInitialEnvelope(variant, preselectedEnvelope));
    setDescription("");
    setStartedAt(Date.now());
    setResult(undefined);
    setError(null);
    setIsSubmitting(false);
  }, [variant, preselectedEnvelope]);

  useEffect(() => {
    if (isOpen) {
      resetFlow();
    }
  }, [isOpen, resetFlow]);

  const recentEnvelopes = useMemo(
    () => extractRecentExpenseEnvelopes(summary?.movements ?? []),
    [summary?.movements],
  );

  const suggestion = useMemo(
    () => suggestEnvelope(amountCents, recentEnvelopes),
    [amountCents, recentEnvelopes],
  );

  useEffect(() => {
    if (step === "envelope" && variant === "fab") {
      setSelectedEnvelope(suggestion.envelopeType);
    }
  }, [step, variant, suggestion.envelopeType]);

  async function submitExpense(
    envelopeType: ExpenseEnvelopeType,
    amount: number,
    concept: string,
  ) {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await registerExpense({
        amount,
        description: concept.trim(),
        envelopeType,
      });
      setResult({
        expenseId: response.expenseId,
        envelopeType: response.envelopeType,
        amount: response.amount,
        remainingAmount: response.remainingAmount,
      });
      setStep("success");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "No pudimos registrar el gasto. Intenta de nuevo.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAmountNext() {
    if (!isKeypadAmountValid(amountCents)) return;
    if (variant === "envelope" && preselectedEnvelope) {
      void submitExpense(preselectedEnvelope, amountCents, description);
      return;
    }
    setSelectedEnvelope(suggestion.envelopeType);
    setStep("envelope");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      close();
      return;
    }
  }

  const currencyCode = summary?.profile.currencyCode ?? DEFAULT_CURRENCY.code;
  const currencySymbol = DEFAULT_CURRENCY.symbol;

  const title =
    variant === "envelope" && preselectedEnvelope
      ? `${EXPENSE_VARIANT_B_TITLE_PREFIX} ${ENVELOPE_LABELS[preselectedEnvelope]}`
      : EXPENSE_FLOW_TITLE;

  return (
    <ExpenseRegisterShell
      open={isOpen && hasActiveCycle}
      onOpenChange={handleOpenChange}
      title={step === "success" ? EXPENSE_FLOW_TITLE : title}
      progress={step === "success" ? null : <FlowProgress step={step} />}
    >
      {step === "amount" && variant === "fab" ? (
        <div className="space-y-4">
          <div className="text-center">
            <p className="mb-1 font-mono text-[10px] tracking-widest text-mute uppercase">
              {EXPENSE_AMOUNT_LABEL}
            </p>
            <p className="font-serif text-[46px] leading-none text-ink">
              {formatKeypadDisplay(amountCents, currencySymbol)}
            </p>
          </div>
          <ExpenseKeypad amountCents={amountCents} onChange={setAmountCents} />
          {error ? (
            <p className="text-center text-sm text-danger">{error}</p>
          ) : null}
          <Button
            type="button"
            disabled={!isKeypadAmountValid(amountCents)}
            onClick={handleAmountNext}
            className="h-12 w-full rounded-[12px] bg-ink text-[15px] font-semibold text-canvas hover:bg-ink/90"
          >
            {EXPENSE_NEXT_CTA}
          </Button>
        </div>
      ) : null}

      {step === "amount" && variant === "envelope" && preselectedEnvelope ? (
        <ExpenseVariantBForm
          envelopeType={preselectedEnvelope}
          amountCents={amountCents}
          description={description}
          currencySymbol={currencySymbol}
          isSubmitting={isSubmitting}
          onAmountChange={setAmountCents}
          onDescriptionChange={setDescription}
          onSubmit={() => {
            if (!isKeypadAmountValid(amountCents)) return;
            void submitExpense(preselectedEnvelope, amountCents, description);
          }}
        />
      ) : null}

      {step === "envelope" && variant === "fab" ? (
        <ExpenseEnvelopeStep
          amountCents={amountCents}
          currencySymbol={currencySymbol}
          selectedEnvelope={selectedEnvelope}
          suggestedEnvelope={suggestion.envelopeType}
          hint={suggestion.hint}
          isSubmitting={isSubmitting}
          onSelectEnvelope={setSelectedEnvelope}
          onConfirm={() => {
            void submitExpense(selectedEnvelope, amountCents, "");
          }}
        />
      ) : null}

      {step === "success" && result ? (
        <ExpenseConfirmation
          amountCents={result.amount}
          envelopeType={result.envelopeType}
          remainingAmount={result.remainingAmount}
          currencyCode={currencyCode}
          startedAt={startedAt}
          onClose={close}
        />
      ) : null}

      {error && step !== "amount" ? (
        <p className="mt-3 text-center text-sm text-danger">{error}</p>
      ) : null}
    </ExpenseRegisterShell>
  );
}
