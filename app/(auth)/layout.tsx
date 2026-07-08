import type { ReactNode } from "react";
import { AuthShell } from "@/modules/auth/components/auth-shell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
