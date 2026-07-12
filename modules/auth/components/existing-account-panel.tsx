"use client";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { authClient } from "@/auth/auth-client";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import { usePasskeySupport } from "../hooks/use-passkey-support";

const passwordOnlySchema = z.object({
  password: z.string().min(1, "La contraseña es requerida"),
});

export function ExistingAccountPanel({
  email,
  onUseAnotherEmail,
}: {
  email: string;
  onUseAnotherEmail?: () => void;
}) {
  const router = useRouter();
  const support = usePasskeySupport();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!support.conditionalUI || tried) return;
    setTried(true);
    void authClient.signIn.passkey({
      autoFill: true,
      fetchOptions: {
        onSuccess: () => {
          router.push("/dashboard");
          router.refresh();
        },
      },
    });
  }, [support.conditionalUI, tried, router]);

  const form = useForm({
    defaultValues: { password: "" },
    validators: { onChange: passwordOnlySchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const { error } = await authClient.signIn.email({
        email,
        password: value.password,
      });
      if (error) {
        setServerError(error.message ?? "Contraseña incorrecta");
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
      setServerError(
        "No se pudo iniciar sesión con passkey. Prueba con tu contraseña.",
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Bienvenido de nuevo
        </h1>
        <p className="text-sm text-balance text-muted-foreground">
          Ya existe una cuenta con{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      {support.webauthn && (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handlePasskeyClick}
          >
            Continuar con passkey
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">
              o con tu contraseña
            </span>
            <Separator className="flex-1" />
          </div>
        </>
      )}

      <form
        id="existing-account-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field
            name="password"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Contraseña</FieldLabel>
                  <Input
                    id={field.name}
                    type="password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
        </FieldGroup>
      </form>

      {serverError && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            form="existing-account-form"
            className="w-full"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Ingresando..." : "Ingresar con contraseña"}
          </Button>
        )}
      </form.Subscribe>

      {onUseAnotherEmail && (
        <button
          type="button"
          onClick={onUseAnotherEmail}
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Usar otro correo
        </button>
      )}
    </div>
  );
}
