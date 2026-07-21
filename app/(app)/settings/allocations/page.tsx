import { redirect } from "next/navigation";
import {
  fetchAuthQuery,
  requireAuthenticatedSession,
} from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { SettingsAllocationsEditor } from "@/modules/settings/components/settings-allocations-editor";

export default async function SettingsAllocationsPage() {
  await requireAuthenticatedSession();
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (!profile) {
    redirect("/onboarding");
  }

  return <SettingsAllocationsEditor />;
}
