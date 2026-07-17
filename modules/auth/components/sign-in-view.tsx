"use client";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/auth/auth-client";
import { QuipuLogo } from "@/shared/components/quipu-logo";
import { emailOnlySchema } from "@/shared/lib/validation/auth";
import { usePasskeySupport } from "../hooks/use-passkey-support";
import { passwordOnlySchema } from "../schemas";
import { AuthSidePanel } from "./auth-side-panel";
import { EmailStep } from "./sign-in-email-step";
import { PasswordStep } from "./sign-in-password-step";

type Step = { kind: "email" } | { kind: "password"; email: string };

export function SignInView({
  initialEmail = "",
  reason,
}: {
  initialEmail?: string;
  reason?: string;
}) {
  const router = useRouter();
  const support = usePasskeySupport();
  const [step, setStep] = useState<Step>(
    initialEmail
      ? { kind: "password", email: initialEmail }
      : { kind: "email" },
  );
  const [error, setError] = useState<"credentials" | "passkey" | null>(null);

  useEffect(() => {
    if (!support.conditionalUI) return;
    void authClient.signIn.passkey({
      autoFill: true,
      fetchOptions: {
        onSuccess: () => {
          toast.success("Bienvenido de vuelta");
          router.push("/dashboard");
          router.refresh();
        },
      },
    });
  }, [support.conditionalUI, router]);

  const emailForm = useForm({
    defaultValues: { email: initialEmail },
    validators: { onChange: emailOnlySchema },
    onSubmit: async ({ value }) => {
      setError(null);
      setStep({ kind: "password", email: value.email });
    },
  });

  const passwordForm = useForm({
    defaultValues: { password: "" },
    validators: { onChange: passwordOnlySchema },
    onSubmit: async ({ value }) => {
      if (step.kind !== "password") return;
      setError(null);
      const { error: err } = await authClient.signIn.email({
        email: step.email,
        password: value.password,
      });
      if (err) {
        setError("credentials");
        return;
      }
      toast.success("Bienvenido de vuelta");
      router.push("/dashboard");
      router.refresh();
    },
  });

  return (
    <div className="grid min-h-svh lg:grid-cols-[400px_1fr]">
      <AuthSidePanel />
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <div className="lg:hidden">
          <QuipuLogo />
        </div>
        <p aria-live="polite" className="sr-only">
          {step.kind === "email"
            ? "Ingresa tu correo para iniciar sesión"
            : `Ingresa tu contraseña para ${step.email}`}
        </p>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-95 flex-col gap-5">
            {step.kind === "email" ? (
              <EmailStep
                form={emailForm}
                reason={reason}
                error={error}
                showPasskey={support.webauthn}
              />
            ) : (
              <PasswordStep
                form={passwordForm}
                email={step.email}
                error={error}
                reason={reason}
                onChangeEmail={() => {
                  setError(null);
                  setStep({ kind: "email" });
                }}
                showPasskey={support.webauthn}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
