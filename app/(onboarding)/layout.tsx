import { redirect } from "next/navigation";
import type { PropsWithChildren, ReactNode } from "react";
import { isAuthenticated } from "@/auth/auth-server";

/**
 * Layout del grupo `(onboarding)`.
 *
 * Por qué existe: el wizard de onboarding es **pre-app** (todavía no
 * hay profile, todavía no hay dashboard). Vive en su propio route group
 * para no contaminar `(app)` con rutas que no requieren el AppShell.
 *
 * Auth gate: si el usuario no está autenticado, redirige a `/sign-in`.
 * NO verificamos si tiene profile: el page.tsx de `/configurar` se
 * encarga de redirigir a `/dashboard` si ya completó el onboarding.
 *
 * El layout es solo composición: no fetchea, no redirige por profile.
 * Si redirigiera acá, perderíamos la lógica de defensa en
 * `/configurar/page.tsx` (caso 2 tabs simultáneos, ver spec §12).
 */
export default async function OnboardingLayout({
  children,
}: PropsWithChildren) {
  const isAuthed = await isAuthenticated();
  if (!isAuthed) {
    redirect("/");
  }

  return <div className="grid grid-cols-1 md:grid-cols-2">{children}</div>;
}
