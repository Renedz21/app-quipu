"use client";

import { useForm } from "@tanstack/react-form";
import { Check, Mail } from "lucide-react";
import { useState } from "react";
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
import { signInWithEmail, signUpWithEmail } from "@/modules/auth/emailPassword";
import { signInEmailSchema, signUpEmailSchema } from "@/modules/auth/schemas";
import { AUTH_MESSAGES } from "@/modules/auth/constants";
import type { MappedAuthError } from "@/modules/auth/types";

type Mode = "signIn" | "signUp";

interface EmailPasswordFormProps {
  mode: Mode;
}

export function EmailPasswordForm({ mode }: EmailPasswordFormProps) {
  const [error, setError] = useState<MappedAuthError | null>(null);

  const schema = mode === "signIn" ? signInEmailSchema : signUpEmailSchema;
  const submitLabel =
    mode === "signIn" ? AUTH_MESSAGES.signIn : AUTH_MESSAGES.createAccount;

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = schema.safeParse(value);
        if (!parsed.success) {
          return parsed.error.issues.map((i) => i.message).join(", ");
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const result =
        mode === "signIn"
          ? await signInWithEmail(value)
          : await signUpWithEmail(value);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Éxito: la página server hace el redirect. Aquí no hacemos nada.
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
                <FieldLabel htmlFor="email">
                  {AUTH_MESSAGES.emailLabel}
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Mail data-icon="inline-start" />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="email"
                    inputMode="email"
                    autoComplete={
                      mode === "signIn" ? "username webauthn" : "username"
                    }
                    placeholder={AUTH_MESSAGES.emailPlaceholder}
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
        <form.Field
          name="password"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="password">
                  {AUTH_MESSAGES.passwordLabel}
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    type="password"
                    autoComplete={
                      mode === "signIn" ? "current-password" : "new-password"
                    }
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    aria-invalid={isInvalid}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </InputGroup>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-destructive">
          {error.message}
        </p>
      )}

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
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
