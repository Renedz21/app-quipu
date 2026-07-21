import { requireOnboardedProfile } from "@/auth/auth-server";
import { CommitmentsView } from "@/modules/commitments/components/commitments-view";

export default async function CommitmentsPage() {
  await requireOnboardedProfile();

  return <CommitmentsView />;
}
