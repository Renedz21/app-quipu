import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { maybeFlagProfileFromTexts } from "../admin/investigation";
import {
  highestSeverity,
  scanTextsForContentFlags,
} from "../lib/contentFlags";

export const scanOpenProfilesForContentFlags = internalMutation({
  args: {},
  returns: v.object({
    profilesScanned: v.number(),
    flagsCreated: v.number(),
  }),
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").take(200);
    let flagsCreated = 0;

    for (const profile of profiles) {
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
      if (!matches.length) continue;

      const existingOpen = await ctx.db
        .query("accountReviewFlags")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .collect();
      const alreadyFlagged = existingOpen.some(
        (flag) =>
          flag.profileId === profile._id && flag.reason === "content",
      );
      if (alreadyFlagged) continue;

      const severity = highestSeverity(matches);
      if (!severity) continue;

      await maybeFlagProfileFromTexts(ctx, profile._id, texts, "content");
      flagsCreated += 1;
    }

    return { profilesScanned: profiles.length, flagsCreated };
  },
});
