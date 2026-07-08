import {
  fetchAuthQuery,
  requireAuthenticatedSession,
} from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  await requireAuthenticatedSession();
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (profile) {
    // Ya completó onboarding, mandarlo al dashboard.
    // El redirect corta la renderización.
    redirect("/dashboard");
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-heading text-2xl font-semibold">
        Onboarding (próximamente)
      </h1>
      <p className="mt-2 text-muted-foreground">
        El wizard de configuración se implementa en P0-2.
      </p>
    </main>
  );
}
