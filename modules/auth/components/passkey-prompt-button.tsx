"use client";

import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { registerPasskey, signInWithPasskey } from "@/modules/auth/passkey";
import { AUTH_MESSAGES } from "@/modules/auth/constants";
import type { MappedAuthError } from "@/modules/auth/types";

type Mode = "signIn" | "signUp";

interface PasskeyPromptButtonProps {
  mode: Mode;
  email?: string;
}

export function PasskeyPromptButton({ mode, email }: PasskeyPromptButtonProps) {
  const router = useRouter();
  const [hasPlatformAuth, setHasPlatformAuth] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<MappedAuthError | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      !window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable
    ) {
      setHasPlatformAuth(false);
      return;
    }
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setHasPlatformAuth)
      .catch(() => setHasPlatformAuth(false));
  }, []);

  const handleClick = async () => {
    if (!hasPlatformAuth) return;
    setIsLoading(true);
    setError(null);

    const result =
      mode === "signIn"
        ? await signInWithPasskey(false)
        : await registerPasskey({
            name: email,
            context: email,
          });

    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Éxito: la página server decide el destino.
    // - signIn: el helper requireUnauthenticatedSession detecta sesión y redirige a /dashboard.
    // - signUp: queremos mostrar primero la pantalla de status "Listo" antes de ir a onboarding.
    if (mode === "signUp") {
      router.replace("/sign-up?status=success");
    } else {
      router.refresh();
    }
  };

  const label = mode === "signIn" ? AUTH_MESSAGES.signIn : AUTH_MESSAGES.signUp;
  const isDisabled = hasPlatformAuth !== true || isLoading;

  if (hasPlatformAuth === null) {
    return (
      <Button size="lg" disabled className="h-12 w-full">
        <Spinner data-icon="inline-start" /> Cargando
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        size="lg"
        onClick={handleClick}
        disabled={isDisabled}
        className="h-12 w-full"
        data-error={error?.code ?? undefined}
      >
        {isLoading ? (
          <>
            <Spinner data-icon="inline-start" /> Cargando
          </>
        ) : (
          <>
            <Fingerprint data-icon="inline-start" /> {label}
          </>
        )}
      </Button>
      {!hasPlatformAuth && (
        <p className="text-center text-sm text-muted-foreground">
          {AUTH_MESSAGES.passkeyNotSupported}
        </p>
      )}
      {/* El link "Usar otro método" lo renderiza la página padre, no este componente. */}
    </div>
  );
}
