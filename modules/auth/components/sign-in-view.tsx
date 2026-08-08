"use client";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/auth/auth-client";
import {
  AnalyticsEvents,
  stampAndComputeDaysSinceLastLogin,
  track,
} from "@/core/analytics";
import { clientEnv } from "@/core/env.client";
import { QuipuLogo } from "@/shared/components/quipu-logo";
import { emailOnlySchema } from "@/shared/lib/validation/auth";
import { usePasskeySupport } from "../hooks/use-passkey-support";
import {
  authFetchOptions,
  requireTurnstileToken,
} from "../lib/auth-fetch-options";
import { resolveAuthDestination } from "../lib/auth-return-to";
import { navigateAfterAuth } from "../lib/navigate-after-auth";
import { passwordOnlySchema } from "../schemas";
import { AuthSidePanel } from "./auth-side-panel";
import { EmailStep } from "./sign-in-email-step";
import { PasswordStep } from "./sign-in-password-step";

type Step = { kind: "email" } | { kind: "password"; email: string };

function isEmailNotVerified(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "EMAIL_NOT_VERIFIED" ||
    message.includes("verify") ||
    message.includes("verif")
  );
}

function trackLogin(method: "password" | "passkey"): void {
  const days_since_last_login = stampAndComputeDaysSinceLastLogin();
  track(AnalyticsEvents.USER_LOGGED_IN, {
    method,
    days_since_last_login,
  });
}

export function SignInView({
  initialEmail = "",
  reason,
  returnTo,
}: {
  initialEmail?: string;
  reason?: string;
  returnTo?: string;
}) {
  const support = usePasskeySupport();
  const [step, setStep] = useState<Step>(
    initialEmail
      ? { kind: "password", email: initialEmail }
      : { kind: "email" },
  );
  const [error, setError] = useState<
    "credentials" | "passkey" | "unverified" | null
  >(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const postAuthDestination = resolveAuthDestination(returnTo, "/dashboard");

  useEffect(() => {
    if (!support.conditionalUI) return;
    void authClient.signIn.passkey({
      autoFill: true,
      fetchOptions: {
        onSuccess: () => {
          trackLogin("passkey");
          toast.success("Bienvenido de vuelta");
          navigateAfterAuth(postAuthDestination);
        },
      },
    });
  }, [support.conditionalUI, postAuthDestination]);

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
      if (
        !requireTurnstileToken(
          turnstileToken,
          clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        )
      ) {
        setError("credentials");
        return;
      }
      const { error: err } = await authClient.signIn.email(
        {
          email: step.email,
          password: value.password,
        },
        authFetchOptions(turnstileToken),
      );
      if (err) {
        setError(isEmailNotVerified(err) ? "unverified" : "credentials");
        return;
      }
      trackLogin("password");
      toast.success("Bienvenido de vuelta");
      navigateAfterAuth(postAuthDestination);
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
                returnTo={returnTo}
              />
            ) : (
              <PasswordStep
                form={passwordForm}
                email={step.email}
                error={error}
                reason={reason}
                turnstileToken={turnstileToken}
                onTurnstileTokenChange={setTurnstileToken}
                onChangeEmail={() => {
                  setError(null);
                  setTurnstileToken(null);
                  setStep({ kind: "email" });
                }}
                showPasskey={support.webauthn}
                returnTo={returnTo}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
