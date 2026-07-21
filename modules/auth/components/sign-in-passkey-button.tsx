"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LockKeyholeOpen } from "reicon-react";
import { toast } from "sonner";
import { authClient } from "@/auth/auth-client";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { authSecondaryButtonClass } from "../constants";

export function SignInPasskeyButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const { error } = await authClient.signIn.passkey();
    setPending(false);
    if (error) return;
    toast.success("Bienvenido de vuelta");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={pending}
      className={cn(authSecondaryButtonClass, "gap-2.5")}
    >
      <LockKeyholeOpen size={24} />
      {pending ? "Verificando..." : "Entrar con passkey"}
    </Button>
  );
}
