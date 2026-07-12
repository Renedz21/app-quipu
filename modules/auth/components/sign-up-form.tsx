"use client";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/auth/auth-client";
import { signUpSchema } from "@/shared/lib/validation/auth";

export function SignUpForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: { onChange: signUpSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const { error } = await authClient.signUp.email({
        name: value.name,
        email: value.email,
        password: value.password,
      });
      if (error) {
        // Better Auth ya devuelve mensajes acotados; no exponer detalles internos
        setServerError(error.message ?? "No se pudo crear la cuenta");
        return;
      }
      router.push("/dashboard");
      router.refresh(); // fuerza a los Server Components a releer la sesión
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => (
          <div>
            <label htmlFor={field.name}>Nombre</label>
            <input
              id={field.name}
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
              autoComplete="new-password"
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
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        )}
      </form.Subscribe>
    </form>
  );
}
