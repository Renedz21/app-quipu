import { requireOnboardedProfile } from "@/auth/auth-server";
import { ProgressRewardsView } from "@/modules/progress/components/progress-rewards-view";

export default async function ProgressRewardsPage() {
  await requireOnboardedProfile();

  return <ProgressRewardsView />;
}
