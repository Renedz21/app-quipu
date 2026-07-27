import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { assertAdminSecret } from "../lib/adminAuth";

const accountStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended"),
  v.literal("under_review"),
);

export const setAccountStatus = mutation({
  args: {
    adminSecret: v.string(),
    profileId: v.id("profiles"),
    accountStatus: accountStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdminSecret(args.adminSecret);
    const profile = await ctx.db.get("profiles", args.profileId);
    if (!profile) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Perfil no encontrado.",
      });
    }

    await ctx.db.patch(args.profileId, {
      accountStatus: args.accountStatus,
    });
    return null;
  },
});

export const dismissReviewFlag = mutation({
  args: {
    adminSecret: v.string(),
    flagId: v.id("accountReviewFlags"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdminSecret(args.adminSecret);
    const flag = await ctx.db.get("accountReviewFlags", args.flagId);
    if (!flag) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Flag no encontrada.",
      });
    }
    await ctx.db.patch(args.flagId, { status: "dismissed" });
    return null;
  },
});

export const actionReviewFlag = mutation({
  args: {
    adminSecret: v.string(),
    flagId: v.id("accountReviewFlags"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdminSecret(args.adminSecret);
    const flag = await ctx.db.get("accountReviewFlags", args.flagId);
    if (!flag) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Flag no encontrada.",
      });
    }
    await ctx.db.patch(args.flagId, { status: "actioned" });
    return null;
  },
});
