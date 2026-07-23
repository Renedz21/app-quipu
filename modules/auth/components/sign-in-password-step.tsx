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

export function PasswordStep({
  form,
  email,
  error,
  reason,
  onChangeEmail,
  showPasskey,
}: {
  form: any;
  email: string;
  error: "credentials" | "passkey" | "unverified" | null;
  reason?: string;
  onChangeEmail: VoidFunction;
  showPasskey: boolean;
}) {
  return (
    <>
      <h1 className="font-semibold text-[22px] text-ink">Iniciar sesión</h1>

      {reason === "exists" && (
        <AuthBanner
          variant="info"
          title="Ya tienes cuenta"
          description="Entra con tu passkey o tu contraseña."
        />
      )}
      {reason === "verify" && (
        <AuthBanner
          variant="info"
          title="Confirma tu correo"
          description="Abre el enlace que te enviamos y luego entra con tu contraseña."
        />
      )}
      {reason === "password-reset" && (
        <AuthBanner
          variant="info"
          title="Contraseña actualizada"
          description="Ya puedes entrar con tu contraseña nueva."
        />
      )}
      {error === "unverified" && (
        <AuthBanner
          variant="info"
          title="Falta confirmar tu correo"
          description="Te reenviamos un enlace. Revisa tu bandeja (y spam) y vuelve a intentar."
        />
      )}
      {error === "credentials" && (
        <AuthBanner
          variant="error"
          title="No pudimos iniciar sesión"
          description="Revisa tu correo y contraseña e intenta de nuevo."
        />
      )}
      {error === "passkey" && (
        <AuthBanner
          variant="error"
          title="No pudimos verificar tu passkey"
          description="Prueba con tu contraseña."
        />
      )}

      <div className="flex items-center justify-between rounded-[11px] border border-line bg-surface-soft px-[15px] py-3">
        <span className="text-[14px] text-body">{email}</span>
        <button
          type="button"
          onClick={onChangeEmail}
          className="text-[13px] font-medium text-qp-deep hover:underline"
        >
          Usar otro correo
        </button>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field name="password">
            {(field: any) => {
              const isInvalid =
                (field.state.meta.isTouched && !field.state.meta.isValid) ||
                error === "credentials";
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name} className={authLabelClass}>
                    Contraseña
                  </FieldLabel>
                  <AuthInput
                    id={field.name}
                    type="password"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    autoComplete="current-password"
                    autoFocus
                  />
                  {field.state.meta.isTouched && !field.state.meta.isValid && (
                    <FieldError errors={field.state.meta.errors} />
                  )}
                  <Link
                    href="/forgot-password"
                    className="mt-2 inline-block text-[12.5px] font-medium text-qp-deep hover:underline"
                  >
                    Olvidé mi contraseña
                  </Link>
                </Field>
              );
            }}
          </form.Field>
        </FieldGroup>
        <div className="flex justify-end">
          <Link
            href={`/recuperar?email=${encodeURIComponent(email)}`}
            className="text-[13px] font-medium text-qp-deep hover:underline"
          >
            Olvidé mi contraseña
          </Link>
        </div>
        <form.Subscribe selector={(s: any) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]: [boolean, boolean]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={authPrimaryButtonClass}
            >
              {isSubmitting ? "Entrando..." : "Continuar"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      {showPasskey && (
        <>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-faint">o con passkey</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <SignInPasskeyButton />
        </>
      )}
    </>
  );
}
