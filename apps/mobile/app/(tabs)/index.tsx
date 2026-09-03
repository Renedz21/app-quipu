import { useRouter } from "expo-router";
import { HomeScreen } from "@/modules/home/home-screen";
import { useHomeSummary } from "@/modules/home/use-home-summary";
import AppShell from "@/shared/components/app-shell";
import { useRegistrarSheet } from "@/shared/components/navigation/registrar-sheet-context";

export default function HomePage() {
  const view = useHomeSummary();
  const { open } = useRegistrarSheet();
  const router = useRouter();

  return (
    <AppShell>
      <HomeScreen
        view={view}
        onRegisterIncome={open}
        onReviewAllocations={() => router.push("/envelopes")}
        onSeeEnvelopes={() => router.push("/envelopes")}
      />
    </AppShell>
  );
}
