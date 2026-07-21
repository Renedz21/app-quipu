import { requireOnboardedProfile } from "@/auth/auth-server";
import { IncomeRegisterFlow } from "@/modules/income/components/income-register-flow";

export default async function IncomeRegisterPage() {
  const profile = await requireOnboardedProfile();

  return (
    <IncomeRegisterFlow
      profile={profile}
      currencyCode={profile.currencyCode}
    />
  );
}
