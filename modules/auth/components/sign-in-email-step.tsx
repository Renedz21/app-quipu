import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import { authLabelClass, authPrimaryButtonClass } from "../constants";
import { AuthBanner } from "./auth-banner";
import { AuthInput } from "./auth-input";
import { SignInPasskeyButton } from "./sign-in-passkey-button";

export function EmailStep({
  form,
  reason,
  error,
  showPasskey,
}: {
  form: any;
  reason?: string;
  error: "credentials" | "passkey" | "unverified" | null;
  showPasskey: boolean;
}) {
  return (
    <>
      <h1 className="font-serif font-medium text-[28px] text-ink leading-[1.12] lg:hidden">
        Bienvenido
        <br />
        de vuelta.
      </h1>
      <h1 className="hidden font-semibold text-[22px] text-ink lg:block">
        Iniciar sesión
      </h1>

      {reason === "exists" && (
        <AuthBanner
          variant="info"
          title="Ya tienes cuenta"
          description="Entra con tu passkey o tu contraseña."
        />
      )}
      {error === "passkey" && (
        <AuthBanner
          variant="error"
          title="No pudimos verificar tu passkey"
          description="Prueba de nuevo o usa tu correo."
        />
      )}

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field name="email">
            {(field: any) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name} className={authLabelClass}>
                    Correo
                  </FieldLabel>
                  <AuthInput
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
          </form.Field>
        </FieldGroup>
        <form.Subscribe selector={(s: any) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]: [boolean, boolean]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={authPrimaryButtonClass}
            >
              {isSubmitting ? "Comprobando..." : "Continuar"}
            </Button>
          )}
        </form.Subscribe>
      </form>
      {showPasskey && (
        <>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-faint">o</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <SignInPasskeyButton />
        </>
      )}
      <div className="mt-1 flex justify-center lg:justify-end">
        <Link
          href="/sign-up"
          className="text-[13px] font-medium text-qp-deep hover:underline"
        >
          Crear una cuenta nueva
        </Link>
      </div>
    </>
  );
}
