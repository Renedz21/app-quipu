import { requireOnboardedProfile } from "@/auth/auth-server";
import { ProgressView } from "@/modules/progress/components/progress-view";

export default async function ProgressPage() {
  await requireOnboardedProfile();

  return <ProgressView />;
}
