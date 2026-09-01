import { renderAuthEmailHtml } from "./authEmailLayout";

type AuthEmailBuildInput = {
  name?: string;
  url: string;
};

function buildGreeting(name?: string): string | undefined {
  if (!name?.trim()) {
    return undefined;
  }
  return `Hola, ${name.trim()}`;
}

function buildPlainText(parts: {
  headline: string;
  greeting?: string;
  paragraphs: string[];
  ctaLabel: string;
  url: string;
  secondaryNote?: string;
  footerLines: string[];
}): string {
  const lines: string[] = [parts.headline, ""];

  if (parts.greeting) {
    lines.push(parts.greeting, "");
  }

  for (const paragraph of parts.paragraphs) {
    lines.push(paragraph, "");
  }

  lines.push(`${parts.ctaLabel}: ${parts.url}`, "");

  if (parts.secondaryNote) {
    lines.push(parts.secondaryNote, "");
  }

  for (const footer of parts.footerLines) {
    lines.push(footer);
  }

  return lines.join("\n").trim();
}

export function buildVerificationEmail(input: AuthEmailBuildInput): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = buildGreeting(input.name);
  const paragraphs = [
    "Gracias por unirte a Quipu. Solo falta un paso para activar el acceso con contraseña.",
    "Passkey sigue disponible mientras verificas tu correo.",
  ];
  const ctaLabel = "Confirmar correo";
  const headline = "Confirma tu correo";

  const html = renderAuthEmailHtml({
    preheader: "Un paso más para activar tu cuenta en Quipu.",
    headline,
    greeting,
    paragraphs,
    cta: { label: ctaLabel, href: input.url },
    footerLines: [
      "Si no creaste una cuenta en Quipu, puedes ignorar este correo.",
    ],
  });

  const text = buildPlainText({
    headline,
    greeting,
    paragraphs,
    ctaLabel,
    url: input.url,
    footerLines: [
      "Si no creaste una cuenta en Quipu, puedes ignorar este correo.",
    ],
  });

  return {
    subject: "Confirma tu correo en Quipu",
    html,
    text,
  };
}

export function buildPasswordResetEmail(input: AuthEmailBuildInput): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = buildGreeting(input.name);
  const paragraphs = [
    "Recibimos una solicitud para restablecer la contraseña de tu cuenta.",
  ];
  const ctaLabel = "Restablecer contraseña";
  const headline = "Elige una contraseña nueva";
  const secondaryNote = "El enlace caduca en una hora.";
  const footerLines = ["Si no lo pediste, ignora este correo."];

  const html = renderAuthEmailHtml({
    preheader: "Restablece tu contraseña de Quipu (válido 1 hora).",
    headline,
    greeting,
    paragraphs,
    cta: { label: ctaLabel, href: input.url },
    secondaryNote,
    footerLines,
  });

  const text = buildPlainText({
    headline,
    greeting,
    paragraphs,
    ctaLabel,
    url: input.url,
    secondaryNote,
    footerLines,
  });

  return {
    subject: "Restablece tu contraseña en Quipu",
    html,
    text,
  };
}

type OtpEmailBuildInput = {
  code: string;
  name?: string;
};

const OTP_EMAIL_STYLES = {
  body: "margin:0;padding:32px 24px;background:#FBFAF7;font-family:Georgia,serif;color:#1A1A1A;",
  card: "max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E8E6DF;border-radius:12px;padding:32px;",
  code: "display:inline-block;margin:16px 0;padding:12px 24px;border:1px solid #E8E6DF;border-radius:8px;font-family:monospace;font-size:32px;letter-spacing:12px;color:#1A1A1A;",
  paragraph:
    "margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1A1A1A;",
  muted:
    "margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#9A968C;",
};

export function buildOtpEmail(input: OtpEmailBuildInput): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = input.name?.trim()
    ? `Hola, ${input.name.trim()}`
    : undefined;
  const paragraphs = ["Tu código para confirmar tu correo en Quipu es:"];

  const html = `<!DOCTYPE html>
<html><body style="${OTP_EMAIL_STYLES.body}">
  <div style="${OTP_EMAIL_STYLES.card}">
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:400;">Confirma tu correo</h1>
    ${greeting ? `<p style="${OTP_EMAIL_STYLES.paragraph}">${greeting}</p>` : ""}
    ${paragraphs.map((p) => `<p style="${OTP_EMAIL_STYLES.paragraph}">${p}</p>`).join("\n    ")}
    <div style="${OTP_EMAIL_STYLES.code}">${input.code}</div>
    <p style="${OTP_EMAIL_STYLES.paragraph}">El código caduca en 10 minutos.</p>
    <p style="${OTP_EMAIL_STYLES.muted}">Si no creaste una cuenta en Quipu, puedes ignorar este correo.</p>
  </div>
</body></html>`;

  const text = [
    "Confirma tu correo",
    ...(greeting ? [greeting, ""] : []),
    ...paragraphs.map((p) => `${p}\n`),
    input.code,
    "",
    "El código caduca en 10 minutos.",
    "",
    "Si no creaste una cuenta en Quipu, puedes ignorar este correo.",
  ].join("\n");

  return {
    subject: `Tu código de Quipu: ${input.code}`,
    html,
    text,
  };
}
