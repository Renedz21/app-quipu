import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { redirect } from "next/navigation";
import { cache } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { clientEnv } from "@/core/env";

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: clientEnv.NEXT_PUBLIC_CONVEX_URL,
  convexSiteUrl: clientEnv.NEXT_PUBLIC_CONVEX_SITE_URL,
});

/**
 * Redirige al usuario ya autenticado al destino correcto según su profile.
 * Usar como primera línea en page.tsx de rutas auth (NO en layout.tsx).
 *
 * - Si hay sesión y profile → /dashboard
 * - Si hay sesión sin profile → /onboarding (wizard de onboarding)
 * - Si no hay sesión → no hace nada
 */
export const getMyProfileRsc = cache(async () =>
  fetchAuthQuery(api.profiles.getMyProfile, {}),
);

export async function requireUnauthenticatedSession() {
  const authed = await isAuthenticated();
  if (!authed) return;
  const profile = await getMyProfileRsc();
  if (profile) {
    redirect("/dashboard");
  } else {
    redirect("/onboarding");
  }
}

/**
 * Garantiza que el usuario está autenticado. Si no, redirige a /sign-in.
 * Usar como primera línea en page.tsx de rutas protegidas (NO en layout.tsx).
 */
export async function requireAuthenticatedSession() {
  const authed = await isAuthenticated();
  if (!authed) {
    redirect("/sign-in");
  }
}

/**
 * Sesión + profile obligatorio para rutas (app). Redirect sign-in / onboarding.
 * Usar en page.tsx del grupo (app), no en layout.tsx (QUIPU-MASTER §5.4).
 */
export async function requireOnboardedProfile(): Promise<Doc<"profiles">> {
  await requireAuthenticatedSession();
  const profile = await getMyProfileRsc();
  if (!profile) {
    redirect("/onboarding");
  }
  return profile;
}
