import { api } from "@quipu/convex-api";
import { useQuery } from "convex/react";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { authClient } from "@/lib/auth-client";
import { Step1IncomeProfile } from "@/modules/onboarding/components/step-1-income-profile";
import { Step2System } from "@/modules/onboarding/components/step-2-system";
import {
  OnboardingProvider,
  useOnboarding,
} from "@/modules/onboarding/onboarding-provider";

function SistemaWizard() {
  const { state } = useOnboarding();

  switch (state.step) {
    case 1:
      return <Step1IncomeProfile />;
    case 2:
      return <Step2System />;
    // Los pasos 3–4, confirm y success llegan en tasks posteriores.
    default:
      return null;
  }
}

export default function SistemaScreen() {
  const { data: session, isPending } = authClient.useSession();
  const hasSession = Boolean(session) && !isPending;
  const profile = useQuery(api.profiles.getMyProfile, hasSession ? {} : "skip");

  if (isPending || (hasSession && profile === undefined)) return null;
  if (!hasSession) return <Redirect href="/(auth)/sign-in" />;
  if (profile?.onboardingComplete) return <Redirect href="/(tabs)" />;

  return (
    <OnboardingProvider>
      <View className="flex-1 bg-background">
        <SistemaWizard />
      </View>
    </OnboardingProvider>
  );
}
