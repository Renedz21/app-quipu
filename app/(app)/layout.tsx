import type { ReactNode } from "react";
import {
  fetchAuthQuery,
  requireAuthenticatedSession,
} from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { AppLayoutShell } from "@/shared/components/layout/app-layout-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireAuthenticatedSession();
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});

  return (
    <AppLayoutShell profileName={profile?.name} plan={profile?.plan ?? "free"}>
      {children}
    </AppLayoutShell>
  );
}
