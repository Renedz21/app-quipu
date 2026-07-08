"use client";

import { useForm } from "@tanstack/react-form";
import { Check, Fingerprint, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { registerPasskey, signInWithPasskey } from "@/auth/passkey";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import { Spinner } from "@/shared/components/ui/spinner";

export default function LoginPage() {
  const router = useRouter();
  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      // Register: crear passkey y luego iniciar sesión.
      // `data.email` se widen-a a `string | undefined` por la unión con el
      // schema de sign-in, pero aquí `isSignIn` es `false` y el resolver de
      // register garantiza que el campo es string. Narrow explícito.
      const trimmed = value.email;
      const reg = await registerPasskey({ name: trimmed, context: trimmed });
      if (reg?.error) {
        return;
      }
      const signIn = await signInWithPasskey(false);
      if (signIn?.error) {
        return;
      }
      router.replace("/dashboard");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field
          name="email"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="email">Correo</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Mail data-icon="inline-start" />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="email"
                    inputMode="email"
                    autoComplete="username webauthn"
                    placeholder="tu@correo.com"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    aria-invalid={isInvalid}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {!isInvalid && (
                    <InputGroupAddon align="inline-end">
                      <Check
                        data-icon="inline-end"
                        className="text-success"
                        aria-label="Email con formato válido"
                      />
                    </InputGroupAddon>
                  )}
                </InputGroup>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>

      <div className="mt-6 flex flex-col gap-3">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-sm font-semibold"
        >
          {form.state.isSubmitting ? (
            <>
              <Spinner data-icon="inline-start" /> Cargando
            </>
          ) : (
            <>
              <Fingerprint data-icon="inline-start" /> Inicia sesion
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
