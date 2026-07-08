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
  // `hasWebAuthn` = el browser soporta WebAuthn. Si false, no podemos ofrecer passkey.
  // `hasPlatformAuth` = hay un authenticator UVPA integrado al dispositivo (biometric/PIN).
  //   Esto NO bloquea el botón; solo se usa para mostrar un copy secundario opcional.
  //   El bug original: bloqueaba el botón cuando UVPA era false, pero el dispositivo
  //   puede tener authenticator cross-platform (YubiKey) o UVPA no detectable.
  //   Ver living doc P0-7 y el fix de 2026-07-08.
  const [hasWebAuthn, setHasWebAuthn] = useState<boolean | null>(null);
  const [hasPlatformAuth, setHasPlatformAuth] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<MappedAuthError | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Si WebAuthn no existe, el browser no soporta passkeys. Caso único donde
    // deshabilitamos el botón. (Esto cubre browsers muy viejos o contextos
    // sin WebAuthn como iframes sandboxed.)
    if (typeof window.PublicKeyCredential === "undefined") {
      setHasWebAuthn(false);
      setHasPlatformAuth(false);
      return;
    }
    setHasWebAuthn(true);
    // UVPA es informativo. No bloquea. Si la promesa falla, asumimos false
    // (sin UVPA) pero el botón sigue activo.
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
      .then(setHasPlatformAuth)
      .catch(() => setHasPlatformAuth(false));
    // Pre-load Conditional UI en signIn mode: arma el autofill del browser
    // para que el prompt de passkey aparezca al focus del input con
    // `autocomplete="... webauthn"`. Sin esto, Chrome no muestra el prompt
    // aunque el usuario tenga passkeys. Ver spec flujo 1.
    if (mode === "signIn") {
      signInWithPasskey(true).catch(() => {
        // El pre-load es best-effort. Si falla, no afecta al botón manual.
      });
    }
  }, [mode]);

  const handleClick = async () => {
    if (!hasWebAuthn) return;
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
  const isDisabled = !hasWebAuthn || isLoading;

  if (hasWebAuthn === null) {
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
      {/* Error inline. Antes se ignoraba: el botón volvía a idle sin feedback
          (regression detectada en final review). Ahora se renderiza con
          role="alert" para accesibilidad. */}
      {error && (
        <p
          role="alert"
          className="text-center text-sm text-destructive"
          data-testid="passkey-error"
        >
          {error.message}
        </p>
      )}
      {/* Solo si el browser NO tiene WebAuthn. Si tiene WebAuthn pero no UVPA,
          el botón sigue activo (puede haber security key externa). */}
      {!hasWebAuthn && (
        <p className="text-center text-sm text-muted-foreground">
          {AUTH_MESSAGES.passkeyNotSupported}
        </p>
      )}
      {/* El link "Usar otro método" lo renderiza la página padre, no este componente. */}
    </div>
  );
}
