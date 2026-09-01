import { type Href, Redirect } from "expo-router";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  // "/sign-in" se crea en Task 5; aún no existe en las rutas tipadas.
  if (!session) return <Redirect href={"/sign-in" as Href} />;

  return <>{children}</>;
}
