import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { shouldTransitionSpaceToReadonly } from "./spaceAuthLogic";

/** Account delete: leave spaces, close owned ones, revoke pending invites. */
export async function detachProfileFromSpacesOnDelete(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
): Promise<void> {
  const now = Date.now();

  const memberships = await ctx.db
    .query("spaceMembers")
    .withIndex("by_profile", (q) => q.eq("profileId", profileId))
    .collect();

  for (const membership of memberships) {
    if (membership.status === "active") {
      await ctx.db.patch(membership._id, {
        status: "left",
        leftAt: now,
      });
    }
  }

  const ownedSpaces = await ctx.db
    .query("financialSpaces")
    .withIndex("by_creator", (q) => q.eq("createdByProfileId", profileId))
    .collect();

  for (const space of ownedSpaces) {
    if (space.status === "active" || space.status === "readonly") {
      await ctx.db.patch(space._id, {
        status: "closed",
        closedAt: now,
      });
    }

    const pendingInvites = await ctx.db
      .query("spaceInvitations")
      .withIndex("by_space_status", (q) =>
        q.eq("spaceId", space._id).eq("status", "pending"),
      )
      .collect();
    for (const invitation of pendingInvites) {
      await ctx.db.patch(invitation._id, { status: "revoked" });
    }
  }
}

export async function transitionOwnedSpacesOnPlanChange(
  ctx: MutationCtx,
  profile: Doc<"profiles">,
): Promise<void> {
  const spaces = await ctx.db
    .query("financialSpaces")
    .withIndex("by_creator", (q) => q.eq("createdByProfileId", profile._id))
    .collect();

  for (const space of spaces) {
    if (shouldTransitionSpaceToReadonly(space, profile)) {
      await ctx.db.patch(space._id, {
        status: "readonly",
        premiumExpiredAt: Date.now(),
      });
    }
  }
}
