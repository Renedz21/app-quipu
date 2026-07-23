import { redirect } from "next/navigation";

/** Alias en inglés → canon `/restablecer-contrasena` (Better Auth callback). */
export default async function ResetPasswordRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const q = new URLSearchParams();
  if (token) q.set("token", token);
  if (error) q.set("error", error);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  redirect(`/restablecer-contrasena${suffix}`);
}
