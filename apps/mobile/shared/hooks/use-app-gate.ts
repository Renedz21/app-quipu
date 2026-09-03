import { api } from "@quipu/convex-api";
import { useConvexAuth, useQuery } from "convex/react";
import { useRef } from "react";
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

  // better-auth revalidates after /sign-out with isPending:true and no data.
  // Once the session has resolved, a revalidation must not re-trigger the
  // boot loading state (it would unmount screens like the intro -> flash).
  const hasResolvedSessionRef = useRef(false);
  if (!isSessionPending) hasResolvedSessionRef.current = true;

  if (isSessionPending && !hasResolvedSessionRef.current) {
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
