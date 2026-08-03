import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import {
  computeAllCommitmentCoverage,
  daysUntilNextDue,
} from "./lib/commitmentCoverage";
import { resolveCommitmentNextDueAt } from "./lib/commitmentDueDate";
import { requirePremiumProfile } from "./lib/entitlements";
import {
  buildUpcomingBadgeLabel,
  filterUpcomingCommitments,
} from "./lib/upcomingCommitments";

const upcomingCommitmentValidator = v.object({
  id: v.id("fixedCommitments"),
  name: v.string(),
  amount: v.number(),
  remaining: v.number(),
  dueDay: v.number(),
  daysUntilDue: v.number(),
  cascadeStatus: v.union(
    v.literal("covered"),
    v.literal("partial"),
    v.literal("not-started"),
    v.literal("overdue"),
  ),
});

export const listUpcomingForBadge = query({
  args: {},
  returns: v.object({
    badgeLabel: v.union(v.string(), v.null()),
    items: v.array(upcomingCommitmentValidator),
  }),
  handler: async (ctx) => {
    const profile = await requirePremiumProfile(ctx);
    const now = Date.now();

    const [activeCycle, commitmentsRaw] = await Promise.all([
      ctx.db
        .query("financialCycles")
        .withIndex("by_profile_status", (q) =>
          q.eq("profileId", profile._id).eq("status", "active"),
        )
        .unique(),
      ctx.db
        .query("fixedCommitments")
        .withIndex("by_profileId", (q) => q.eq("profileId", profile._id))
        .collect(),
    ]);

    const incomeEvents = activeCycle
      ? await ctx.db
          .query("incomeEvents")
          .withIndex("by_cycle", (q) => q.eq("cycleId", activeCycle._id))
          .collect()
      : [];

    const excludedCommitmentIds = new Set<string>();
    if (activeCycle) {
      for (const commitment of commitmentsRaw) {
        if (commitment.postponedForCycleId === activeCycle._id) {
          excludedCommitmentIds.add(commitment._id);
        }
      }
    }

    const coverageById = activeCycle
      ? computeAllCommitmentCoverage({
          commitments: commitmentsRaw.map((commitment) => ({
            id: commitment._id,
            amount: commitment.amount,
            envelope: commitment.envelope,
            dueDay: commitment.dueDay,
            nextDueAt: commitment.nextDueAt,
            createdAt: commitment._creationTime,
          })),
          cycle: {
            startDate: activeCycle.startDate,
            endDate: activeCycle.endDate,
          },
          incomeEvents: incomeEvents.map((event) => ({
            id: event._id,
            occurredAt: event.occurredAt,
            distributionApplied: event.distributionApplied,
          })),
          now,
          coverageBoost: activeCycle.coverageBoost ?? undefined,
          excludedCommitmentIds,
        })
      : new Map();

    const slices = commitmentsRaw.map((commitment) => {
      const nextDueAt = resolveCommitmentNextDueAt({
        dueDay: commitment.dueDay,
        nextDueAt: commitment.nextDueAt,
        createdAt: commitment._creationTime,
      });
      const coverage = coverageById.get(commitment._id);

      return {
        id: commitment._id,
        name: commitment.name,
        amount: commitment.amount,
        remaining: coverage?.remaining ?? commitment.amount,
        dueDay: commitment.dueDay,
        nextDueAt,
        daysUntilDue: daysUntilNextDue(nextDueAt, now),
        cascadeStatus: coverage?.status ?? ("not-started" as const),
      };
    });

    const allUpcoming = filterUpcomingCommitments(slices, now);
    const upcoming = allUpcoming.slice(0, 3);

    return {
      badgeLabel: buildUpcomingBadgeLabel(allUpcoming.length),
      items: upcoming.map((item) => ({
        id: item.id as Id<"fixedCommitments">,
        name: item.name,
        amount: item.amount,
        remaining: item.remaining,
        dueDay: item.dueDay,
        daysUntilDue: item.daysUntilDue,
        cascadeStatus: item.cascadeStatus,
      })),
    };
  },
});
