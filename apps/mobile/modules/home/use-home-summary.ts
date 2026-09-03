import { api } from "@quipu/convex-api";
import { useQuery } from "convex/react";
import { toHomeView } from "./to-home-view";
import type { DashboardSummary, HomeView } from "./types";

const DEFAULT_ALLOCATIONS = { needs: 50, wants: 30, savings: 20 };

export function useHomeSummary(): HomeView {
  const summary = useQuery(api.dashboard.getSummary, {});
  const profile = useQuery(api.profiles.getMyProfile, {});

  return toHomeView(summary as DashboardSummary | null | undefined, {
    needs: profile?.allocationNeeds ?? DEFAULT_ALLOCATIONS.needs,
    wants: profile?.allocationWants ?? DEFAULT_ALLOCATIONS.wants,
    savings: profile?.allocationSavings ?? DEFAULT_ALLOCATIONS.savings,
  });
}
