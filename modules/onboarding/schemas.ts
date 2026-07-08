/**
 * Schemas Zod del wizard de onboarding.
 *
 * Cada paso del wizard tiene su propio schema. El `finalPayloadSchema`
 * es la composición de todos y es lo que el `completeOnboardingAction`
 * valida antes de llamar a `createProfile` + `createCommitmentsBulk`.
 *
 * Reglas:
 * - `finalPayloadSchema` es la **única** fuente de verdad para el
 *   payload final. Los schemas por step existen solo para feedback
 *   temprano en cada paso (no para re-validar al final).
 * - El backend Convex hace su propia validación. Este es solo UX.
 * - Los `paydays` siguen las mismas reglas que `isValidPaydays` de
 *   `convex/lib/budgetMath.ts` pero extendidas a las 4 frecuencias
 *   que maneja el wizard. Cuando el slice 2 extienda el union del
 *   backend, los tests de este archivo se mantienen (el contrato
 *   cliente no cambia).
 */

import { z } from "zod";

/** Paso 1: nombre del usuario. */
export const step1Schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Necesitamos un nombre para continuar.")
    .max(60, "El nombre debe tener máximo 60 caracteres."),
});

/** Paso 2: modelo de ingresos. */
export const step2Schema = z.object({
  incomeModel: z.enum(["fixed", "variable", "mixed"], {
    error: "Elige cómo son tus ingresos.",
  }),
});

/** Paso 3: cadencia + días. Reglas por cadencia. */
const paydaysSchema = z
  .array(z.number().int("Los días deben ser números enteros.").min(1).max(31))
  .superRefine((paydays, ctx) => {
    if (paydays.length === 0) {
      // Permitido solo si la cadencia es "variable". El superRefine de
      // step3Schema decide según `payFrequency` si esto es error.
      return;
    }
    const unique = new Set(paydays);
    if (unique.size !== paydays.length) {
      ctx.addIssue({
        code: "custom",
        message: "Los días de pago no pueden repetirse.",
      });
    }
  });

export const step3Schema = z
  .object({
    payFrequency: z.enum(["monthly", "biweekly", "weekly", "variable"]),
    paydays: paydaysSchema,
  })
  .superRefine((value, ctx) => {
    const { payFrequency, paydays } = value;
    if (payFrequency === "variable") {
      // Variable: paydays puede ser vacío.
      return;
    }
    if (payFrequency === "biweekly" && paydays.length !== 2) {
      ctx.addIssue({
        code: "custom",
        path: ["paydays"],
        message: "Para quincenal, define 2 días (1-31).",
      });
    }
    if (
      (payFrequency === "monthly" || payFrequency === "weekly") &&
      paydays.length < 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["paydays"],
        message: `Para ${payFrequency}, define al menos 1 día.`,
      });
    }
  });

/** Paso 4: read-only. No hay schema (no se capturan datos). */

/** Paso 5: allocations. Suma exacta 100, enteros 0-100. */
const allocationField = z
  .number()
  .int("Los porcentajes deben ser enteros.")
  .min(0, "Los porcentajes no pueden ser negativos.")
  .max(100, "Los porcentajes no pueden ser mayores a 100.");

export const step5Schema = z
  .object({
    allocationNeeds: allocationField,
    allocationWants: allocationField,
    allocationSavings: allocationField,
  })
  .refine(
    (value) =>
      value.allocationNeeds +
        value.allocationWants +
        value.allocationSavings ===
      100,
    {
      message: "El reparto debe sumar exactamente 100%.",
    },
  );

/** Paso 6: commitments. Array, puede ser vacío. */
export const commitmentDraftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del compromiso es obligatorio.")
    .max(60, "El nombre es demasiado largo."),
  amountCents: z
    .number()
    .int("El monto debe ser un entero (céntimos).")
    .positive("El monto debe ser mayor a cero."),
  frequency: z.enum([
    "monthly",
    "first_payday",
    "second_payday",
    "every_payday",
  ]),
  envelope: z.enum(["needs", "wants"], {
    error: "El compromiso solo puede ir a Necesidades o Gustos.",
  }),
});

export const step6Schema = z.object({
  commitments: z.array(commitmentDraftSchema).default([]),
});

/**
 * Payload completo que se envía al `completeOnboardingAction`.
 * Es la composición de los 6 schemas editables (1, 2, 3, 5, 6) más
 * los defaults que el action completa si el cliente no los manda
 * (country, currencyCode, currencySymbol). El paso 7 (summary) no
 * aporta datos al payload: el botón "Activar mi copiloto" dispara el
 * submit directamente con el state acumulado.
 *
 * Implementación: NO desestructuramos `.shape` (eso pierde los
 * `.refine` y `.superRefine`). Hacemos un `z.object` con los mismos
 * campos y aplicamos las mismas refinaciones al final.
 */
export const finalPayloadSchema = z
  .object({
    name: step1Schema.shape.name,
    incomeModel: step2Schema.shape.incomeModel,
    payFrequency: step3Schema.shape.payFrequency,
    paydays: step3Schema.shape.paydays,
    allocationNeeds: step5Schema.shape.allocationNeeds,
    allocationWants: step5Schema.shape.allocationWants,
    allocationSavings: step5Schema.shape.allocationSavings,
    commitments: step6Schema.shape.commitments,
    country: z.string().default("Perú"),
    currencyCode: z.string().default("PEN"),
    currencySymbol: z.string().default("S/"),
  })
  .superRefine((value, ctx) => {
    // Allocations: suma exacta 100.
    const sum =
      value.allocationNeeds + value.allocationWants + value.allocationSavings;
    if (sum !== 100) {
      ctx.addIssue({
        code: "custom",
        path: ["allocationNeeds"],
        message: "El reparto debe sumar exactamente 100%.",
      });
    }
    // Paydays según cadencia (mismas reglas que step3Schema).
    if (value.payFrequency === "biweekly" && value.paydays.length !== 2) {
      ctx.addIssue({
        code: "custom",
        path: ["paydays"],
        message: "Para quincenal, define 2 días (1-31).",
      });
    }
    if (
      (value.payFrequency === "monthly" || value.payFrequency === "weekly") &&
      value.paydays.length < 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["paydays"],
        message: `Para ${value.payFrequency}, define al menos 1 día.`,
      });
    }
  });
