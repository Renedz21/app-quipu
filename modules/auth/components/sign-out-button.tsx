"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/auth/auth-client";
import { Button } from "@/shared/components/ui/button";
import { authSecondaryButtonClass } from "../constants";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
      className={authSecondaryButtonClass}
    >
      Cerrar sesión
    </Button>
  );
}
