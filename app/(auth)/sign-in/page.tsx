import Link from "next/link";
import { requireUnauthenticatedSession } from "@/auth/auth-server";
import { PasskeyPromptButton } from "@/modules/auth/components/passkey-prompt-button";
import { mapBetterAuthError } from "@/modules/auth/errorMap";
import { AUTH_MESSAGES } from "@/modules/auth/constants";
import { StatusCard } from "@/shared/components/auth/status-card";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignInPage({ searchParams }: PageProps) {
  await requireUnauthenticatedSession();
  const { error: errorCode } = await searchParams;

  // Flow 5 del spec: si hay ?error=CODE, renderizar el StatusCard correspondiente.
  // El componente del botón también muestra el error inline (ver C1 fix), pero
  // esta es la ruta para errores que vienen de redirects (ej. después de un
  // sign-in fallido desde /sign-in/email).
  if (errorCode) {
    const mapped = mapBetterAuthError(errorCode);
    return (
      <div className="flex flex-col gap-6">
        <StatusCard
          variant={mapped.variant}
          title="No pudimos iniciar sesión"
          description={mapped.message}
          primaryAction={{
            label: AUTH_MESSAGES.retry,
            href: "/sign-in",
          }}
          secondaryAction={{
            label: AUTH_MESSAGES.useOtherMethod,
            href: "/sign-in/email",
          }}
        />
      </div>
    );
  }

  // Si llegamos acá sin redirect, no hay sesión. Renderizar el form.

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          {/* Logo placeholder */}
          <span className="font-heading text-lg font-semibold">Q</span>
        </div>
        <h1 className="font-heading text-2xl font-semibold">Inicia sesión</h1>
        <p className="text-sm text-muted-foreground">
          Continúa con Passkey para acceder de forma segura.
        </p>
      </header>

      <PasskeyPromptButton mode="signIn" />

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/sign-in/email"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          {AUTH_MESSAGES.useOtherMethod}
        </Link>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Inicia el registro
        </Link>
      </p>
    </div>
  );
}
