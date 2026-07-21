"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_CURRENCY } from "@/core/constants";
import { useDashboardSummary } from "@/modules/dashboard/hooks/use-dashboard-summary";
import type { IncomeFlowStep, IncomeRegisterResult } from "../types";
import { IncomeConfirmation } from "./income-confirmation";
import { IncomeRegisterForm } from "./income-register-form";

export function IncomeRegisterFlow() {
  const summary = useDashboardSummary();
  const profile = useQuery(api.profiles.getMyProfile, {});
  const createIncomeEvent = useMutation(api.incomeEvents.createIncomeEvent);

  const [step, setStep] = useState<IncomeFlowStep>("form");
  const [result, setResult] = useState<IncomeRegisterResult | undefined>();

  const currencyCode =
    summary?.profile.currencyCode ??
    profile?.currencyCode ??
    DEFAULT_CURRENCY.code;
  const currencySymbol = DEFAULT_CURRENCY.symbol;

  if (step === "success" && result) {
    return <IncomeConfirmation result={result} currencyCode={currencyCode} />;
  }

  if (profile === undefined) {
    return null;
  }

  if (profile === null) {
    return null;
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
