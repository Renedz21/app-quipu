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

export async function sendVerificationEmail(
  params: AuthEmailRecipient,
): Promise<void> {
  const { subject, html, text } = buildVerificationEmail({
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

export async function sendPasswordResetEmail(
  params: AuthEmailRecipient,
): Promise<void> {
  const { subject, html, text } = buildPasswordResetEmail({
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
