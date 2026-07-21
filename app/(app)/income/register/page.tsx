import { redirect } from "next/navigation";
import {
  fetchAuthQuery,
  requireAuthenticatedSession,
} from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { IncomeRegisterFlow } from "@/modules/income/components/income-register-flow";

export default async function IncomeRegisterPage() {
  await requireAuthenticatedSession();
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (!profile) {
    redirect("/onboarding");
  }

  return <IncomeRegisterFlow />;
}
