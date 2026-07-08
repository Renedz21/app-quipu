import Link from "next/link";
import { requireUnauthenticatedSession } from "@/auth/auth-server";
import { PasskeyPromptButton } from "@/modules/auth/components/passkey-prompt-button";
import { mapBetterAuthError } from "@/modules/auth/errorMap";
import { StatusCard } from "@/shared/components/auth/status-card";
import { AUTH_MESSAGES } from "@/modules/auth/constants";
import { Card, CardContent } from "@/shared/components/ui/card";

interface PageProps {
  searchParams: Promise<{ status?: string; error?: string }>;
}

export default async function SignUpPage({ searchParams }: PageProps) {
  await requireUnauthenticatedSession();
  const params = await searchParams;

  if (params.status === "success") {
    return (
      <StatusCard
        variant="success"
        title={AUTH_MESSAGES.signUpSuccessTitle}
        description={AUTH_MESSAGES.signUpSuccessDescription}
        primaryAction={{
          label: AUTH_MESSAGES.configureMyCycle,
          href: "/configurar",
        }}
      />
    );
  }

  // Flow 5 del spec: si hay ?error=CODE, renderizar el StatusCard correspondiente.
  if (params.error) {
    const mapped = mapBetterAuthError(params.error);
    return (
      <div className="flex flex-col gap-6">
        <StatusCard
          variant={mapped.variant}
          title="No pudimos crear tu cuenta"
          description={mapped.message}
          primaryAction={{
            label: AUTH_MESSAGES.retry,
            href: "/sign-up",
          }}
          secondaryAction={{
            label: AUTH_MESSAGES.useOtherMethod,
            href: "/sign-up/email",
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <span className="font-heading text-lg font-semibold">Q</span>
        </div>
        <h1 className="font-heading text-2xl font-semibold">Crea tu cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Sin contraseñas que recordar. Solo tú con una llave segura en este
          dispositivo.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              {AUTH_MESSAGES.emailLabel}
            </label>
            <PasskeyPromptButton mode="signUp" email="placeholder@quipu.pe" />
            <p className="text-xs text-muted-foreground">
              Tu dispositivo creará una llave única protegida con Face ID o
              huella.
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/sign-up/email"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          {AUTH_MESSAGES.useOtherMethod}
        </Link>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
