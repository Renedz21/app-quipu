import { type Href, useRouter, useSegments } from "expo-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { type AppGateStatus, useAppGate } from "@/shared/hooks/use-app-gate";

type DecidedStatus = Exclude<AppGateStatus, "loading">;

const HREF_BY_STATUS: Record<DecidedStatus, Href> = {
  unauthenticated: "/(onboarding)",
  onboarding: "/(onboarding)/sistema",
  ready: "/(tabs)",
};

const ALLOWED_GROUPS: Record<DecidedStatus, string[]> = {
  unauthenticated: ["(onboarding)", "(auth)"],
  onboarding: ["(onboarding)"],
  ready: ["(tabs)"],
};

export default function RouteGuard({ children }: { children: ReactNode }) {
  const { status } = useAppGate();
  const segments = useSegments();
  const activeGroup = segments[0];
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (ALLOWED_GROUPS[status].includes(activeGroup ?? "")) return;
    router.replace(HREF_BY_STATUS[status]);
  }, [status, activeGroup, router]);

  return <>{children}</>;
}
