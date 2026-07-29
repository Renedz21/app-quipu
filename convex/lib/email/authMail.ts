import { isDevelopmentDeployment } from "../deployment";
import {
  buildPasswordResetEmail,
  buildVerificationEmail,
} from "./authTemplates";
import { sendOutboundEmail } from "./send";

type AuthEmailRecipient = {
  to: string;
  url: string;
  name?: string | null;
};

type AuthEmailKind = "verification" | "password_reset";

function logAuthEmailLinkToConsole(
  kind: AuthEmailKind,
  params: AuthEmailRecipient,
): void {
  const label =
    kind === "verification"
      ? "Verificación de correo (registro)"
      : "Restablecer contraseña";

  console.log(
    `[Quipu dev] ${label} — Resend desactivado.\n` +
      `  to: ${params.to}\n` +
      `  url: ${params.url}`,
  );
}

async function deliverAuthEmail(
  kind: AuthEmailKind,
  params: AuthEmailRecipient,
  build: typeof buildVerificationEmail,
): Promise<void> {
  if (isDevelopmentDeployment()) {
    logAuthEmailLinkToConsole(kind, params);
    return;
  }

  const { subject, html, text } = build({
    url: params.url,
    name: params.name ?? undefined,
  });

  await sendOutboundEmail({
    to: params.to,
    subject,
    html,
    text,
  });
}

export async function sendVerificationEmail(
  params: AuthEmailRecipient,
): Promise<void> {
  await deliverAuthEmail("verification", params, buildVerificationEmail);
}

export async function sendPasswordResetEmail(
  params: AuthEmailRecipient,
): Promise<void> {
  await deliverAuthEmail("password_reset", params, buildPasswordResetEmail);
}
