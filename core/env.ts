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
 *
 * Las variables de cliente (NEXT_PUBLIC_) viven en `@/core/env.client` para
 * que Convex (que no tiene acceso a ellas) no las evalúe al cargar este módulo.
 */

const serverSchema = z.object({
  CONVEX_DEPLOY_KEY: z.string().optional(),

  BETTER_AUTH_SECRET: z.string(),

  POLAR_WEBHOOK_SECRET: z.string().optional(),
  POLAR_ORGANIZATION_TOKEN: z.string().optional(),
  POLAR_PRODUCT_ID_PREMIUM: z.string(),
  POLAR_SERVER: z.string(),
});

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

export type ServerEnv = z.infer<typeof serverSchema>;
