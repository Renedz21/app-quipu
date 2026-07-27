import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { maybeFlagProfileFromTexts } from "../admin/investigation";
import { highestSeverity, scanTextsForContentFlags } from "../lib/contentFlags";

export const scanOpenProfilesForContentFlags = internalMutation({
  args: {},
  returns: v.object({
    profilesScanned: v.number(),
    flagsCreated: v.number(),
  }),
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").take(200);
    const existingOpen = await ctx.db
      .query("accountReviewFlags")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    const flaggedProfileIds = new Set(
      existingOpen
        .filter((flag) => flag.reason === "content")
        .map((flag) => flag.profileId),
    );

    const scanResults = await Promise.all(
      profiles.map(async (profile) => {
        const incomeEvents = await ctx.db
          .query("incomeEvents")
          .withIndex("by_profile_time", (q) => q.eq("profileId", profile._id))
          .order("desc")
          .take(10);

        const texts = [
          ...incomeEvents.map((event) => event.description),
          ...(profile.variableIncomeSources ?? []),
        ];
        const matches = scanTextsForContentFlags(texts);
        return { profileId: profile._id, texts, matches };
      }),
    );

    const toFlag = scanResults.filter(({ profileId, matches }) => {
      if (!matches.length) return false;
      if (flaggedProfileIds.has(profileId)) return false;
      return highestSeverity(matches) !== null;
    });

    await Promise.all(
      toFlag.map(({ profileId, texts }) =>
        maybeFlagProfileFromTexts(ctx, profileId, texts, "content"),
      ),
    );

    return {
      profilesScanned: profiles.length,
      flagsCreated: toFlag.length,
    };
  },
});
