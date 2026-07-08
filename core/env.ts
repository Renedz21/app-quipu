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
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET debe tener al menos 32 caracteres"),

  // Polar.sh (webhooks de pago)
  POLAR_WEBHOOK_SECRET: z.string().optional(),
  POLAR_API_KEY: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z
    .string()
    .url("NEXT_PUBLIC_CONVEX_URL debe ser una URL válida"),
  NEXT_PUBLIC_CONVEX_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_CONVEX_SITE_URL debe ser una URL válida"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

/**
 * Variables de entorno del cliente. Son seguras de importar desde cualquier
 * archivo (incluidos Client Components) porque solo exponen lo público.
 */
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

/**
 * Validador de variables de servidor. Solo se ejecuta cuando se importa desde
 * un archivo del servidor (RSC, Route Handler, Server Action). En build de
 * cliente falla si falta una variable crítica.
 */
function parseServerEnv() {
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

export const serverEnv = parseServerEnv();

/**
 * Type exports para uso externo.
 */
export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
