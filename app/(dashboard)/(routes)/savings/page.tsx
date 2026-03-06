import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import { SavingsClient } from "@/modules/savings/components/savings-client";

export default async function SavingsPage() {
  const [preloadedSubs, preloadedGoals, preloadedProfile] = await Promise.all([
    preloadAuthQuery(api.savings.getSavingsSubEnvelopes),
    preloadAuthQuery(api.savings.getSavingsGoals),
    preloadAuthQuery(api.profiles.getMyProfile),
  ]);

  return (
    <SavingsClient
      preloadedSubs={preloadedSubs}
      preloadedGoals={preloadedGoals}
      preloadedProfile={preloadedProfile}
    />
  );
}
