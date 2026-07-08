/**
 * Server actions del wizard de onboarding v2.5.
 *
 * "use server" corre en el servidor. Llama a Convex vía `fetchAuthMutation`
 * que envuelve el token de sesión automáticamente.
 *
 * Arquitectura:
 * - `completeOnboardingAction` es el submit final del wizard.
 *   Valida con Zod, llama a `createProfile`, opcionalmente
 *   `createCommitmentsBulk`, y retorna el profileId.
 * - NO redirige desde el server action. El cliente (Step7Summary)
 *   recibe el resultado y navega a la pantalla de éxito.
 * - Los errores se retornan como `AppError` serializado, no se
 *   lanzan (el cliente los captura sin try/catch).
 */

"use server";

import { fetchAuthMutation } from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { fromConvexError } from "@/core/errors";
import { finalPayloadSchema } from "./schemas";

export async function completeOnboardingAction(input: unknown) {
  // 1. Validar cliente (Zod refleja las reglas del backend pero
  //    es independiente: el backend valida igual).
  const parsed = finalPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: {
        code: "VALIDATION_ERROR" as const,
        message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      },
    };
  }

  try {
    // 2. Crear perfil (mutation idempotente: si ya existe, retorna el existente).
    const profileId = await fetchAuthMutation(api.profiles.createProfile, {
      name: parsed.data.name,
      country: parsed.data.country,
      currencyCode: parsed.data.currencyCode,
      currencySymbol: parsed.data.currencySymbol,
      incomeModel: parsed.data.incomeModel,
      payFrequency:
        parsed.data.payFrequency === "variable"
          ? undefined
          : parsed.data.payFrequency,
      paydays: parsed.data.paydays.length > 0 ? parsed.data.paydays : undefined,
      allocationNeeds: parsed.data.allocationNeeds,
      allocationWants: parsed.data.allocationWants,
      allocationSavings: parsed.data.allocationSavings,
    });

    // 3. Crear compromisos si hay.
    if (parsed.data.commitments.length > 0) {
      await fetchAuthMutation(api.fixedCommitments.createCommitmentsBulk, {
        profileId,
        commitments: parsed.data.commitments.map((c) => ({
          name: c.name,
          amount: c.amountCents,
          envelope: c.envelope,
          dueDay: c.dueDay,
        })),
      });
    }

    // 4. Limpiar sessionStorage (el wizard terminó). El cliente lo hace
    //    desde el success handler, pero avisamos.
    return { success: true as const, profileId };
  } catch (error) {
    const appError = fromConvexError(error);
    return {
      success: false as const,
      error: { code: appError.code, message: appError.message },
    };
  }
}
