"use client";
import { useState } from "react";
import { LockKeyholeOpen } from "reicon-react";
import { toast } from "sonner";
import { authClient } from "@/auth/auth-client";
import {
  AnalyticsEvents,
  stampAndComputeDaysSinceLastLogin,
  track,
} from "@/core/analytics";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { authSecondaryButtonClass } from "../constants";
import { navigateAfterAuth } from "../lib/navigate-after-auth";

export function SignInPasskeyButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const { error } = await authClient.signIn.passkey().finally(() => {
      setPending(false);
    });
    if (error) return;
    track(AnalyticsEvents.USER_LOGGED_IN, {
      method: "passkey",
      days_since_last_login: stampAndComputeDaysSinceLastLogin(),
    });
    toast.success("Bienvenido de vuelta");
    navigateAfterAuth("/dashboard");
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
