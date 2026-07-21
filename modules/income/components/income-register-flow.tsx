"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { DEFAULT_CURRENCY } from "@/core/constants";
import { useDashboardSummary } from "@/modules/dashboard/queries";
import type { IncomeFlowStep, IncomeRegisterResult } from "../types";
import { IncomeConfirmation } from "./income-confirmation";
import { IncomeRegisterForm } from "./income-register-form";

type IncomeRegisterFlowProps = {
  profile: Doc<"profiles">;
  currencyCode: string;
};

export function IncomeRegisterFlow({
  profile,
  currencyCode: serverCurrencyCode,
}: IncomeRegisterFlowProps) {
  const summary = useDashboardSummary();
  const createIncomeEvent = useMutation(api.incomeEvents.createIncomeEvent);

  const [step, setStep] = useState<IncomeFlowStep>("form");
  const [result, setResult] = useState<IncomeRegisterResult | undefined>();

  const currencyCode =
    summary?.profile.currencyCode ?? serverCurrencyCode ?? DEFAULT_CURRENCY.code;
  const currencySymbol = DEFAULT_CURRENCY.symbol;

  if (step === "success" && result) {
    return <IncomeConfirmation result={result} currencyCode={currencyCode} />;
  }

  return (
    <IncomeRegisterForm
      currencyCode={currencyCode}
      currencySymbol={currencySymbol}
      profile={profile}
      summary={summary ?? undefined}
      createIncomeEvent={createIncomeEvent}
      onSuccess={(response) => {
        setResult(response);
        setStep("success");
      }}
    />
  );
}
