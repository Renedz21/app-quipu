import { redirect } from "next/navigation";
import {
  fetchAuthQuery,
  requireAuthenticatedSession,
} from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { SignOutButton } from "@/modules/auth/components/sign-out-button";

export default async function DashboardPage() {
  await requireAuthenticatedSession();
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (!profile) {
    redirect("/onboarding");
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-heading text-2xl font-semibold">
        Dashboard (próximamente)
      </h1>
      <p className="mt-2 text-muted-foreground">
        El dashboard real se implementa en otra historia.
      </p>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
