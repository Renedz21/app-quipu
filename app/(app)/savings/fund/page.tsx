import { redirect } from "next/navigation";
import {
  fetchAuthQuery,
  requireAuthenticatedSession,
} from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { EmergencyFundDetailView } from "@/modules/savings/components/emergency-fund-detail-view";

export default async function EmergencyFundPage() {
  await requireAuthenticatedSession();
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (!profile) {
    redirect("/onboarding");
  }

  return <EmergencyFundDetailView />;
}
