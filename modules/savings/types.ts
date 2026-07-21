import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type SavingsOverview = NonNullable<
  FunctionReturnType<typeof api.savings.getOverview>
>;

export type SavingsEmergencyFund = NonNullable<
  SavingsOverview["emergencyFund"]
>;

export type SavingsGoal = SavingsOverview["goals"][number];

export type EmergencyFundDetail = NonNullable<
  FunctionReturnType<typeof api.savings.getEmergencyFundDetail>
>;
