import { requireOnboardedProfile } from "@/auth/auth-server";
import { MovementsView } from "@/modules/movements/components/movements-view";

export default async function MovementsPage() {
  await requireOnboardedProfile();

  return <MovementsView />;
}
