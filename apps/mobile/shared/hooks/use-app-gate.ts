import { api } from "@quipu/convex-api";
import { useConvexAuth, useQuery } from "convex/react";
import { authClient } from "@/lib/auth-client";

export type AppGateStatus =
  | "loading"
  | "unauthenticated"
  | "onboarding"
  | "ready";

export function useAppGate() {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { isAuthenticated, isLoading: isConvexAuthPending } = useConvexAuth();

  // Convex recién tiene el token cuando la conexión quedó autenticada
  // (isAuthenticated) y no hay handshake en curso (isConvexAuthPending).
  const isAuthReady = isAuthenticated && !isConvexAuthPending;
  const profile = useQuery(
    api.profiles.getMyProfile,
    isAuthReady ? {} : "skip",
  );

  if (isSessionPending) {
    return { status: "loading" as const, isLoading: true, profile };
  }
  if (!session) {
    return { status: "unauthenticated" as const, isLoading: false, profile };
  }
  if (!isAuthReady || profile === undefined) {
    return { status: "loading" as const, isLoading: true, profile };
  }
  if (!profile?.onboardingComplete) {
    return { status: "onboarding" as const, isLoading: false, profile };
  }
  return { status: "ready" as const, isLoading: false, profile };
}
