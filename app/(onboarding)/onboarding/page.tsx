import { redirect } from "next/navigation";
import { fetchAuthQuery } from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { OnboardingWizard } from "@/modules/onboarding/components/onboarding-wizard";

export default async function OnboardingPage() {
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (profile) {
    redirect("/dashboard");
  }
  return <OnboardingWizard />;
}
