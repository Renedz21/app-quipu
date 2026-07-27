export function authFetchOptions(turnstileToken: string | null) {
  if (!turnstileToken) return {};
  return {
    headers: {
      "x-cf-turnstile-token": turnstileToken,
    },
  } as const;
}

export function requireTurnstileToken(
  turnstileToken: string | null,
  siteKey?: string,
): boolean {
  if (!siteKey) return true;
  return Boolean(turnstileToken);
}
