"use client";

import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_CURRENCY } from "@/core/constants";
import { ENVELOPE_LABELS } from "@/modules/dashboard/constants";
import { useDashboardSummary } from "@/modules/dashboard/hooks/use-dashboard-summary";
import {
  EXPENSE_FLOW_TITLE,
  EXPENSE_VARIANT_B_TITLE_PREFIX,
} from "../constants";
import { useExpenseRegister } from "../hooks/use-expense-register-context";
import { extractRecentExpenseEnvelopes } from "../lib/envelopeSuggestion";
import type { ExpenseFlowStep, ExpenseRegisterResult } from "../types";
import { ExpenseConfirmation } from "./expense-confirmation";
import { ExpenseRegisterForm } from "./expense-register-form";
import { ExpenseRegisterShell, FlowProgress } from "./expense-register-shell";

export function ExpenseRegisterFlow() {
  const { isOpen, close, options } = useExpenseRegister();
  const summary = useDashboardSummary();
  const registerExpense = useMutation(api.expenses.registerExpense);

  const [step, setStep] = useState<ExpenseFlowStep>("amount");
  const [startedAt, setStartedAt] = useState(Date.now());
  const [result, setResult] = useState<ExpenseRegisterResult | undefined>();
  const [resetToken, setResetToken] = useState(0);

  const variant = options.variant ?? "fab";
  const preselectedEnvelope = options.preselectedEnvelope;
  const hasActiveCycle = Boolean(summary?.cycle);

  const resetFlow = useCallback(() => {
    setStep("amount");
    setStartedAt(Date.now());
    setResult(undefined);
    setResetToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetFlow();
    }
  }, [isOpen, resetFlow]);

  const recentEnvelopes = useMemo(
    () => extractRecentExpenseEnvelopes(summary?.movements ?? []),
    [summary?.movements],
  );

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      close();
    }
  }

  const currencyCode = summary?.profile.currencyCode ?? DEFAULT_CURRENCY.code;

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
      {step !== "success" ? (
        <ExpenseRegisterForm
          key={resetToken}
          step={step}
          setStep={setStep}
          variant={variant}
          preselectedEnvelope={preselectedEnvelope}
          recentEnvelopes={recentEnvelopes}
          currencySymbol={DEFAULT_CURRENCY.symbol}
          registerExpense={registerExpense}
          onSuccess={(response) => {
            setResult(response);
            setStep("success");
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
    </ExpenseRegisterShell>
  );
}
