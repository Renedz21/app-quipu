import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Returns the authenticated user's profile, or null if not authenticated
 * or the profile doesn't exist yet.
 *
 * Use this in queries that may run before onboarding is complete.
 * The client handles null by redirecting to onboarding.
 */
export async function getProfile(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
    .unique();
}

/**
 * Returns the authenticated user's profile, or throws ConvexError if:
 * - not authenticated
 * - profile doesn't exist yet (onboarding not completed)
 *
 * Use this in mutations where the profile must exist to operate.
 * `identity.subject` is the Better Auth user._id stored in profiles.userId
 */
export async function getProfileOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
    .unique();

  if (!profile) {
    throw new ConvexError("Profile not found");
  }

  return profile;
}

/**
 * Returns the authenticated user's userId (Better Auth user._id), or throws.
 * Use this when you need the ID but not the profile (e.g., during onboarding).
 */
export async function getAuthUserIdOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }
  return identity.subject;
}

/**
 * Throws if the profile's plan is not "premium".
 * Call after getProfileOrThrow.
 */
export function requirePremium(plan: "free" | "premium") {
  if (plan !== "premium") {
    throw new ConvexError("This feature requires a premium plan");
  }
}

/**
 * Returns YYYY-MM string for the current month (UTC).
 */
export function currentMonthString(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Returns YYYY-MM-DD string for today (UTC).
 */
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}
