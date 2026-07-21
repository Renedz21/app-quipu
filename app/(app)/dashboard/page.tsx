import { requireOnboardedProfile } from "@/auth/auth-server";
import { DashboardView } from "@/modules/dashboard/components/dashboard-view";

export default async function DashboardPage() {
  const profile = await requireOnboardedProfile();

  return <DashboardView profileName={profile.name} />;
}
