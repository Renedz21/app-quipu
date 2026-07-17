import { requireUnauthenticatedSession } from "@/auth/auth-server";
import { SignInView } from "@/modules/auth/components/sign-in-view";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; reason?: string }>;
}) {
  await requireUnauthenticatedSession();
  const { email, reason } = await searchParams;
  return <SignInView initialEmail={email ?? ""} reason={reason} />;
}
