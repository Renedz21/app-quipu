import Link from "next/link";
import { requireUnauthenticatedSession } from "@/auth/auth-server";
import { PasskeyPromptButton } from "@/modules/auth/components/passkey-prompt-button";
import { AUTH_MESSAGES } from "@/modules/auth/constants";

export default async function SignInPage() {
  await requireUnauthenticatedSession();

  // Si llegamos acá sin redirect, no hay sesión. Renderizar el form.
  // Nota: el botón passkey no muestra ?status=success en sign-in porque
  // un usuario existente va directo a dashboard (decisión 3 del spec).

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
