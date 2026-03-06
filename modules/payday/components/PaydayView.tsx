"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePayday } from "../hooks/use-payday";
import PaydayStep from "./PaydayStep";
import AssigningStep from "./AssigningStep";
import DoneStep from "./DoneStep";

type Props = {
  preloadedProfile: Preloaded<typeof api.profiles.getMyProfile>;
};

export default function PaydayView({ preloadedProfile }: Props) {
  const profile = usePreloadedQuery(preloadedProfile);
  const { step, handleAssign } = usePayday();

  if (!profile) return null;

  const { currencySymbol, monthlyIncome, allocationNeeds, allocationWants, allocationSavings } =
    profile;

  return (
    <section className="animate-in fade-in duration-200">
      {step === "idle" && (
        <PaydayStep
          currencySymbol={currencySymbol}
          monthlyIncome={monthlyIncome}
          onAssign={handleAssign}
        />
      )}

      {step === "assigning" && (
        <AssigningStep
          currencySymbol={currencySymbol}
          monthlyIncome={monthlyIncome}
          allocationNeeds={allocationNeeds}
          allocationWants={allocationWants}
          allocationSavings={allocationSavings}
        />
      )}

      {step === "done" && <DoneStep />}
    </section>
  );
}
