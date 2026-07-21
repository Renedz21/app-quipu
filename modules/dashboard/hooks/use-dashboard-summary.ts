"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useDashboardSummary() {
  return useQuery(api.dashboard.getSummary, {});
}
