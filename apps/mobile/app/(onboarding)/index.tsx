import { api } from "@quipu/convex-api";
import { useQuery } from "convex/react";
import { Redirect, router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { authClient } from "@/lib/auth-client";
import { IntroCarousel } from "@/modules/onboarding/components/intro-carousel";

export default function OnboardingIndexScreen() {
  const { data: session, isPending } = authClient.useSession();
  const hasSession = Boolean(session) && !isPending;
  const profile = useQuery(api.profiles.getMyProfile, hasSession ? {} : "skip");

  useEffect(() => {
    if (hasSession && profile?.onboardingComplete) {
      router.replace("/(tabs)");
    }
  }, [hasSession, profile]);

  // Sin sesión: la intro es la puerta de entrada al onboarding.
  if (!hasSession) {
    return (
      <View className="flex-1 bg-background px-0 pt-16">
        <IntroCarousel />
      </View>
    );
  }

  // Con sesión pero perfil aún cargando: no renderizar nada.
  if (profile === undefined) return null;

  // Perfil sin onboarding completo: directo al wizard.
  if (!profile.onboardingComplete) {
    return <Redirect href="/(onboarding)/sistema" />;
  }

  // Con onboarding completo el efecto navega a /(tabs).
  return null;
}
