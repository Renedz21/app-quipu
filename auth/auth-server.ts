import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});

/**
 * Redirige al usuario ya autenticado al destino correcto según su profile.
 * Usar como primera línea en page.tsx de rutas auth (NO en layout.tsx).
 *
 * - Si hay sesión y profile → /dashboard
 * - Si hay sesión sin profile → /onboarding (wizard de onboarding)
 * - Si no hay sesión → no hace nada
 */
export async function requireUnauthenticatedSession() {
  const authed = await isAuthenticated();
  if (!authed) return;
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
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
