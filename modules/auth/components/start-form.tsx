"use client";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { emailOnlySchema } from "@/shared/lib/validation/auth";
import { usePasskeySupport } from "../hooks/use-passkey-support";
import { generateInternalPassword } from "../lib/random-password";
import { AddPasskeyButton } from "./add-passkey-button";
import { ExistingAccountPanel } from "./existing-account-panel";

type Mode =
  | { kind: "email" }
  | { kind: "existing"; email: string }
  | { kind: "needs-passkey" };

// Distintas versiones/formas de better-auth exponen el código de error
// de manera distinta. No confiar en un único string exacto.
function isUserAlreadyExists(error: {
  code?: string;
  status?: number;
  message?: string;
}) {
  return (
    error.code === "USER_ALREADY_EXISTS" ||
    error.status === 422 ||
    error.message?.toLowerCase().includes("already exists")
  );
}

export function StartForm() {
  const router = useRouter();
  const support = usePasskeySupport();
  const [mode, setMode] = useState<Mode>({ kind: "email" });
  const [serverError, setServerError] = useState<string | null>(null);
  const [passkeyPending, setPasskeyPending] = useState(false);

  const form = useForm({
    defaultValues: { email: "" },
    validators: { onChange: emailOnlySchema },
    onSubmit: async ({ value }) => {
      setServerError(null);

      const { error } = await authClient.signUp.email({
        email: value.email,
        password: generateInternalPassword(),
        name: value.email.split("@")[0] ?? value.email,
      });

      if (error) {
        if (isUserAlreadyExists(error)) {
          setMode({ kind: "existing", email: value.email });
          return;
        }
        setServerError(error.message ?? "No se pudo continuar");
        return;
      }

      setMode({ kind: "needs-passkey" });
    },
  });

  async function handlePasskeySignIn() {
    setServerError(null);
    setPasskeyPending(true);
    const { error } = await authClient.signIn.passkey();
    setPasskeyPending(false);
    if (error) {
      setServerError(
        "No se encontró un passkey en este dispositivo. Usa tu email.",
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  useEffect(() => {
    if (!support.conditionalUI || mode.kind !== "email") return;
    void authClient.signIn.passkey({
      autoFill: true,
      fetchOptions: {
        onSuccess: () => {
          router.push("/dashboard");
          router.refresh();
        },
      },
    });
  }, [support.conditionalUI, mode.kind, router]);

  if (mode.kind === "existing") {
    return <ExistingAccountPanel email={mode.email} />;
  }

  if (mode.kind === "needs-passkey") {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-xl font-semibold">Un último paso</h2>
          <p className="text-sm text-muted-foreground">
            Configura tu passkey para entrar sin contraseña la próxima vez.
          </p>
        </div>
        <AddPasskeyButton
          onSuccessAction={() => {
            router.push("/dashboard");
            router.refresh();
          }}
        />
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            router.push("/dashboard");
            router.refresh();
          }}
        >
          Hacerlo más tarde
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6  text-card-foreground ">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Ingresa o crea tu cuenta
        </h1>
        <p className="text-sm text-balance text-muted-foreground">
          Empieza ingresando tus datos para continuar
        </p>
      </div>

      {support.webauthn && (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handlePasskeySignIn}
            disabled={passkeyPending}
          >
            {passkeyPending ? "Verificando..." : "Entrar con passkey"}
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">
              o continúa con tu email
            </span>
            <Separator className="flex-1" />
          </div>
        </>
      )}

      <form
        id="email-passkey-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
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
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    id={field.name}
                    type="email"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    autoComplete="username webauthn"
                    autoFocus
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

      <Button
        type="submit"
        form="email-passkey-form"
        className="w-full"
        disabled={form.state.isSubmitting}
      >
        {form.state.isSubmitting ? "Comprobando..." : "Continuar"}
      </Button>
    </div>
  );
}
