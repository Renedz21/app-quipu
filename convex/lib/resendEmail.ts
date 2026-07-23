type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Envía email transaccional vía Resend. Usado desde Better Auth (verificación / recovery).
 * Si falta RESEND_API_KEY, registra warning y no lanza (dev local sin proveedor).
 */
export async function sendResendEmail(params: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "RESEND_API_KEY no configurada; email no enviado:",
      params.subject,
      "→",
      params.to,
    );
    return;
  }

  const from = process.env.RESEND_FROM ?? "Quipu <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Resend error:", response.status, body);
    throw new Error("No pudimos enviar el correo. Intenta más tarde.");
  }
}
