import { z } from "zod";

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(80, "Máximo 80 caracteres.");

export const cycleScheduleSchema = z.object({
  payFrequency: z.enum(["monthly", "biweekly"]).optional(),
  paydays: z.array(z.number().int().min(1).max(31)).optional(),
  cycleDurationDays: z.union([z.literal(15), z.literal(30)]).optional(),
});
