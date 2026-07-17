import { requireUnauthenticatedSession } from "@/auth/auth-server";
import { SignUpView } from "@/modules/auth/components/sign-up-view";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  await requireUnauthenticatedSession();
  const { email } = await searchParams;
  return <SignUpView initialEmail={email ?? ""} />;
}
