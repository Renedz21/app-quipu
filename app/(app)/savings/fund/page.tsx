import { requireOnboardedProfile } from "@/auth/auth-server";
import { EmergencyFundDetailView } from "@/modules/savings/components/emergency-fund-detail-view";

export default async function SavingsFundPage() {
  await requireOnboardedProfile();

  return <EmergencyFundDetailView />;
}
