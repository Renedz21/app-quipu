import Link from "next/link";
import { requireUnauthenticatedSession } from "@/auth/auth-server";
import { EmailPasswordForm } from "@/modules/auth/components/email-password-form";

export default async function SignInEmailPage() {
  await requireUnauthenticatedSession();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-2xl font-semibold">Inicia sesión</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa tu correo y contraseña.
        </p>
      </header>

      <EmailPasswordForm mode="signIn" />

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/sign-in"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Volver a Passkey
        </Link>
      </p>
    </div>
  );
}
