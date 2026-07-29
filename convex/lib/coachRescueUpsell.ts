type RescueUpsellProfile = {
  plan: "free" | "premium";
  coachRescueUpsellAt?: number;
  coachRescueUpsellDismissedAt?: number;
};

/** True when a free user triggered rescue and has not dismissed that upsell yet. */
export function isRescueUpsellAvailable(profile: RescueUpsellProfile): boolean {
  if (profile.plan !== "free") return false;
  if (profile.coachRescueUpsellAt == null) return false;
  if (profile.coachRescueUpsellDismissedAt == null) return true;
  return profile.coachRescueUpsellDismissedAt < profile.coachRescueUpsellAt;
}
