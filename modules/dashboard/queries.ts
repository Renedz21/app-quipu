"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type DashboardSummaryQueryResult = FunctionReturnType<
  typeof api.dashboard.getSummary
>;

export function useDashboardSummary() {
  return useQuery(api.dashboard.getSummary, {});
}
