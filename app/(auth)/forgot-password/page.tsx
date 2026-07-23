import type { Metadata } from "next";
import { requireUnauthenticatedSession } from "@/auth/auth-server";
import { pageMetadata } from "@/core/seo";
import { ForgotPasswordView } from "@/modules/auth/components/forgot-password-view";

export const metadata: Metadata = pageMetadata({
  title: "Recuperar acceso",
  path: "/forgot-password",
  index: false,
});

export default async function ForgotPasswordPage() {
  await requireUnauthenticatedSession();
  return <ForgotPasswordView />;
}
