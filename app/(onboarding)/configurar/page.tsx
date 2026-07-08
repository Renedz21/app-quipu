import { redirect } from "next/navigation";
import { fetchAuthQuery } from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { OnboardingWizard } from "@/modules/onboarding/components/onboarding-wizard";
import { parseStepId } from "@/modules/onboarding/constants";

type Props = {
  searchParams: Promise<{ step?: string }>;
};

/**
 * Server component del wizard de onboarding.
 *
 * Responsabilidades:
 * 1. Validar sesión: si no hay, redirige a `/sign-in` (el layout ya
 *    hace esto, pero defense in depth: si alguien navega por código
 *    sin pasar por el layout, igual cae a /sign-in).
 * 2. Verificar profile: si ya completó onboarding, redirige a
 *    `/dashboard`. Esto cubre el caso de "2 tabs simultáneos":
 *    la primera que termina el onboarding crea el profile; la segunda
 *    detecta al recargar y redirige.
 * 3. Parsear `?step=` con `parseStepId` (rechaza valores fuera de 1-8).
 * 4. Renderizar el `<OnboardingWizard />` con el step inicial.
 *
 * El wizard en sí es un Client Component (`'use client'`). Esta page
 * solo le pasa props de servidor (initialStep).
 */
export default async function ConfigurarPage({ searchParams }: Props) {
  const { step } = await searchParams;
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});

  if (profile) {
    // Ya completó onboarding: lo mandamos al dashboard.
    redirect("/dashboard");
  }

  const initialStep = parseStepId(step) ?? 1;
  return <OnboardingWizard initialStep={initialStep} />;
}
