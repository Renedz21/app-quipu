"use client";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/auth/auth-client";
import { signInSchema } from "@/shared/lib/validation/auth";
import { usePasskeySupport } from "../hooks/use-passkey-support";

export function SignInForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const support = usePasskeySupport();

  // Conditional UI: si el navegador lo soporta, ofrece el autofill de
  // passkey sin bloquear el resto del formulario.
  useEffect(() => {
    if (!support.conditionalUI) return;
    void authClient.signIn.passkey({
      autoFill: true,
      fetchOptions: {
        onSuccess: () => {
          router.push("/dashboard");
          router.refresh();
        },
      },
    });
  }, [support.conditionalUI, router]);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onChange: signInSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });
      if (error) {
        setServerError(error.message ?? "Email o contraseña incorrectos");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    },
  });

  async function handlePasskeyClick() {
    setServerError(null);
    const { error } = await authClient.signIn.passkey();
    if (error) {
      setServerError(error.message ?? "No se pudo iniciar sesión con passkey");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      {support.platformAuthenticator && (
        <button type="button" onClick={handlePasskeyClick}>
          Continuar con passkey
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field name="email">
          {(field) => (
            <div>
              <label htmlFor={field.name}>Email</label>
              <input
                id={field.name}
                type="email"
                autoComplete="username webauthn"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors[0] && (
                <p role="alert">{field.state.meta.errors[0].message}</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div>
              <label htmlFor={field.name}>Contraseña</label>
              <input
                id={field.name}
                type="password"
                autoComplete="current-password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors[0] && (
                <p role="alert">{field.state.meta.errors[0].message}</p>
              )}
            </div>
          )}
        </form.Field>

        {serverError && <p role="alert">{serverError}</p>}

        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar con contraseña"}
            </button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
