import { z } from "zod";
import { KEYPAD_MAX_CENTS } from "@/modules/expenses/lib/keypad";
import { limaIncomeDateMinTimestamp, limaStartOfDay } from "@/shared/lib/date";
import type { IncomeSource } from "./types";

const incomeSourceValues = [
  "payroll",
  "freelance",
  "business",
  "gift",
  "refund",
  "investment",
  "other",
] as const satisfies readonly IncomeSource[];

export function createIncomeRegisterSchema(now: number = Date.now()) {
  const maxOccurredAt = limaStartOfDay(now);
  const minOccurredAt = limaIncomeDateMinTimestamp(now);

  return z.object({
    amountCents: z
      .number()
      .int("El monto debe ser un número entero.")
      .min(1, "Ingresa un monto mayor a cero.")
      .max(
        KEYPAD_MAX_CENTS,
        "El monto supera el máximo permitido para registrar.",
      ),
    source: z.enum(incomeSourceValues, {
      error: "Elige un origen para el ingreso.",
    }),
    concept: z
      .string()
      .max(120, "El concepto no puede superar 120 caracteres."),
    occurredAt: z
      .number()
      .int()
      .min(
        minOccurredAt,
        "La fecha es demasiado antigua para registrar este ingreso.",
      )
      .max(maxOccurredAt, "La fecha no puede ser futura."),
  });
}

export type IncomeRegisterFormValues = z.infer<
  ReturnType<typeof createIncomeRegisterSchema>
>;

export const incomeRegisterSchema = createIncomeRegisterSchema();
