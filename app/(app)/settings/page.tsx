import { requireOnboardedProfile } from "@/auth/auth-server";
import { SettingsView } from "@/modules/settings/components/settings-view";

export default async function SettingsPage() {
  await requireOnboardedProfile();

  return <SettingsView />;
}
