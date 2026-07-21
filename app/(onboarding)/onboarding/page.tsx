import { redirect } from "next/navigation";
import { getMyProfileRsc } from "@/auth/auth-server";
import { OnboardingWizard } from "@/modules/onboarding/components/onboarding-wizard";

export default async function OnboardingPage() {
  const profile = await getMyProfileRsc();
  if (profile) {
    redirect("/dashboard");
  }
  return <OnboardingWizard />;
}
