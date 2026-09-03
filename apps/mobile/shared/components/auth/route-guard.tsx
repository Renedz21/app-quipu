import { type Href, Redirect, useSegments } from "expo-router";
import type { ReactNode } from "react";
import { type AppGateStatus, useAppGate } from "@/shared/hooks/use-app-gate";

type DecidedStatus = Exclude<AppGateStatus, "loading">;

const ALLOWED_GROUPS: Record<DecidedStatus, string[]> = {
  unauthenticated: ["(onboarding)", "(auth)"],
  onboarding: ["(onboarding)"],
  ready: ["(tabs)"],
};

const HREF_BY_STATUS: Record<DecidedStatus, Href> = {
  unauthenticated: "/(onboarding)",
  onboarding: "/(onboarding)/sistema",
  ready: "/(tabs)",
};

export default function RouteGuard({ children }: { children: ReactNode }) {
  const { status } = useAppGate();
  const segments = useSegments();
  const activeGroup = segments[0];

  if (status === "loading") {
    // Mientras se resuelve la sesión solo se muestran grupos públicos;
    // evita el flash de contenido protegido en cold start.
    const isPublicGroup =
      activeGroup === "(auth)" || activeGroup === "(onboarding)";
    return isPublicGroup ? <>{children}</> : null;
  }

  if (ALLOWED_GROUPS[status].includes(activeGroup ?? "")) {
    return <>{children}</>;
  }

  return <Redirect href={HREF_BY_STATUS[status]} />;
}
