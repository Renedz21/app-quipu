import { z } from "zod";
import { KEYPAD_MAX_CENTS } from "@/modules/expenses/lib/keypad";
import { parseOptionalTargetCents } from "./lib/savingsCopy";

export function createNewGoalSchema() {
  return z
    .object({
      label: z
        .string()
        .trim()
        .min(1, "El nombre de la meta es obligatorio.")
        .max(40, "El nombre de la meta debe tener como máximo 40 caracteres."),
      targetInput: z.string(),
    })
    .superRefine((data, ctx) => {
      const trimmed = data.targetInput.trim();
      if (!trimmed) return;

      const cents = parseOptionalTargetCents(data.targetInput);
      if (cents === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Ingresa un monto válido.",
          path: ["targetInput"],
        });
        return;
      }
      if (cents <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "La meta debe ser un monto mayor a cero.",
          path: ["targetInput"],
        });
        return;
      }
      if (cents > KEYPAD_MAX_CENTS) {
        ctx.addIssue({
          code: "custom",
          message: "El monto supera el máximo permitido para registrar.",
          path: ["targetInput"],
        });
      }
    });
}

export type NewGoalFormValues = z.infer<ReturnType<typeof createNewGoalSchema>>;

export const newGoalSchema = createNewGoalSchema();

export function newGoalFormToMutationArgs(values: NewGoalFormValues) {
  return {
    label: values.label.trim(),
    targetAmount: parseOptionalTargetCents(values.targetInput),
  };
}
