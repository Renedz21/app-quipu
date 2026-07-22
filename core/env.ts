import { z } from "zod";

/**
 * Variables de entorno validadas en build/start.
 *
 * Cualquier acceso a `process.env.X` desde la app debe pasar por este módulo.
 * Esto garantiza que:
 *   - Falla en build (no en runtime) si falta una variable crítica.
 *   - El tipado es estricto y autocompletado.
 *   - Variables de servidor (sin prefijo NEXT_PUBLIC_) no se filtran al cliente.
 *
 * Convex y Better Auth leen `process.env` directamente desde sus archivos de
 * configuración; este módulo es la puerta de entrada para el resto del código.
 */

const serverSchema = z.object({
  // Convex
  CONVEX_DEPLOY_KEY: z.string().optional(),

  // Better Auth
  BETTER_AUTH_SECRET: z.string(),

  // Polar.sh (webhooks de pago)
  POLAR_WEBHOOK_SECRET: z.string().optional(),
  POLAR_API_KEY: z.string().optional(),
});

const clientSchema = z.object({
  /** URL pública de la app (metadataBase, canonical, sitemap). Sin barra final. */
  NEXT_PUBLIC_APP_URL: z.url(
    "NEXT_PUBLIC_APP_URL debe ser una URL válida (p. ej. http://localhost:3000)",
  ),
  NEXT_PUBLIC_CONVEX_URL: z.url(
    "NEXT_PUBLIC_CONVEX_URL debe ser una URL válida",
  ),
  NEXT_PUBLIC_CONVEX_SITE_URL: z.url(
    "NEXT_PUBLIC_CONVEX_SITE_URL debe ser una URL válida",
  ),
  NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z
    .string()
    .min(1, "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN es obligatorio"),
  NEXT_PUBLIC_POSTHOG_HOST: z.url(
    "NEXT_PUBLIC_POSTHOG_HOST debe ser una URL válida",
  ),
});

/**
 * Variables de entorno del cliente. Son seguras de importar desde cualquier
 * archivo (incluidos Client Components) porque solo exponen lo público.
 */
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
  NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN:
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

/**
 * Validador de variables de servidor. Usar vía `@/core/env.server` (`serverEnv`),
 * nunca desde el cliente: secrets no existen en el bundle del navegador.
 */
export function parseServerEnv() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const { formErrors, fieldErrors } = z.flattenError(parsed.error);
    const fieldMessages = Object.entries(fieldErrors)
      .map(([key, msgs]) => `  - ${key}: ${msgs?.join(", ")}`)
      .join("\n");
    const formMessages = formErrors.map((m) => `  - ${m}`).join("\n");
    const messages = [fieldMessages, formMessages].filter(Boolean).join("\n");
    throw new Error(`Variables de entorno inválidas:\n${messages}`);
  }
  return parsed.data;
}

/**
 * Type exports para uso externo.
 */
export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
