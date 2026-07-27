const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Dev/local sin secret: no bloquear el flujo.
    return true;
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) return false;
  const data = (await response.json()) as TurnstileVerifyResponse;
  return data.success === true;
}

export function authPathRequiresTurnstile(pathname: string): boolean {
  return (
    pathname.includes("/sign-up") ||
    pathname.includes("/sign-in") ||
    pathname.includes("/request-password-reset") ||
    pathname.includes("/forget-password") ||
    pathname.includes("/send-verification-email")
  );
}
