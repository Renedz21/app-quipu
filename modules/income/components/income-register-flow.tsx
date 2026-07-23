"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { DEFAULT_CURRENCY } from "@/core/constants";
import { useDashboardSummary } from "@/modules/dashboard/queries";
import type { DistributionPolicy } from "@/shared/lib/allocations";
import type { IncomeFlowStep, IncomeRegisterResult } from "../types";
import { IncomeConfirmation } from "./income-confirmation";
import { IncomeRegisterForm } from "./income-register-form";
import { IncomeRegisterSkeleton } from "./income-register-skeleton";

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
  const [successVariant, setSuccessVariant] = useState<
    "habitual" | "extraordinary"
  >("habitual");
  const [showMoveSurplusLink, setShowMoveSurplusLink] = useState(false);
  const [successDistributionPolicy, setSuccessDistributionPolicy] = useState<
    DistributionPolicy | undefined
  >();

  const currencyCode =
    summary?.profile.currencyCode ??
    serverCurrencyCode ??
    DEFAULT_CURRENCY.code;

  if (summary === undefined) {
    return <IncomeRegisterSkeleton />;
  }

  if (step === "success" && result) {
    return (
      <IncomeConfirmation
        result={result}
        currencyCode={currencyCode}
        variant={successVariant}
        distributionPolicy={successDistributionPolicy}
        showMoveSurplusLink={showMoveSurplusLink}
      />
    );
  }

  return (
    <IncomeRegisterForm
      currencyCode={currencyCode}
      profile={profile}
      summary={summary}
      createIncomeEvent={createIncomeEvent}
      onSuccess={(response, options) => {
        setSuccessVariant(options?.incomeKind ?? "habitual");
        setShowMoveSurplusLink(options?.incomeKind === "extraordinary");
        setSuccessDistributionPolicy(options?.distributionPolicy);
        setResult(response);
        setStep("success");
      }}
    />
  );
}
