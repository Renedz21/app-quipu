import { requireOnboardedProfile } from "@/auth/auth-server";
import { SettingsAllocationsEditor } from "@/modules/settings/components/settings-allocations-editor";

export default async function SettingsAllocationsPage() {
  const profile = await requireOnboardedProfile();

  return (
    <SettingsAllocationsEditor
      initialAllocation={{
        allocationNeeds: profile.allocationNeeds,
        allocationWants: profile.allocationWants,
        allocationSavings: profile.allocationSavings,
      }}
    />
  );
}
