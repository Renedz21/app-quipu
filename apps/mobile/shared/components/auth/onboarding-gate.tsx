import { api } from "@quipu/convex-api";
import { useQuery } from "convex/react";
import { type Href, Redirect } from "expo-router";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

const ONBOARDING_INDEX = "/(onboarding)";
// El screen sistema llega en una task posterior; typed routes aún no la conoce.
const ONBOARDING_SISTEMA = "/(onboarding)/sistema" as Href;

export default function OnboardingGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const hasSession = Boolean(session) && !isPending;
  const profile = useQuery(api.profiles.getMyProfile, hasSession ? {} : "skip");

  if (isPending || (hasSession && profile === undefined)) return null;

  if (!hasSession) return <Redirect href={ONBOARDING_INDEX} />;
  if (!profile?.onboardingComplete)
    return <Redirect href={ONBOARDING_SISTEMA} />;
  return <>{children}</>;
}
