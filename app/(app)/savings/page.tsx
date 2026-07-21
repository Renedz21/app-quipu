import { requireOnboardedProfile } from "@/auth/auth-server";
import { SavingsView } from "@/modules/savings/components/savings-view";

export default async function SavingsPage() {
  await requireOnboardedProfile();

  return <SavingsView />;
}
