import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type DashboardSummary = NonNullable<
  FunctionReturnType<typeof api.dashboard.getSummary>
>;

export type DashboardCycle = NonNullable<DashboardSummary["cycle"]>;
export type DashboardHero = NonNullable<DashboardSummary["hero"]>;
export type DashboardEnvelope = DashboardSummary["envelopes"][number];
export type DashboardCommitment = DashboardSummary["commitments"][number];
export type DashboardCoach = NonNullable<DashboardSummary["coach"]>;
export type DashboardMovement = DashboardSummary["movements"][number];
export type StatusBadge = DashboardHero["statusBadge"];
