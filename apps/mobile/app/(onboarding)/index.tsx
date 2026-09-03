import { Redirect } from "expo-router";
import { View } from "react-native";
import { IntroCarousel } from "@/modules/onboarding/components/intro-carousel";
import { useAppGate } from "@/shared/hooks/use-app-gate";

export default function OnboardingIndexScreen() {
  const { status, isLoading } = useAppGate();

  if (isLoading) return null;

  // Sesión con onboarding pendiente: directo al wizard.
  if (status === "onboarding") {
    return <Redirect href="/(onboarding)/sistema" />;
  }

  // Con onboarding completo RouteGuard lleva a /(tabs); no decidir aquí.
  if (status === "ready") return null;

  // Sin sesión: la intro es la puerta de entrada al onboarding.
  return (
    <View className="flex-1 bg-background px-0 pt-16">
      <IntroCarousel />
    </View>
  );
}
