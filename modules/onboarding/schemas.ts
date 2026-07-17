import { z } from "zod";

export const step1Schema = z.object({
  incomeModel: z.enum(["fixed", "variable", "mixed"]),
});

export const step2Schema = z.object({
  payFrequency: z.enum(["monthly", "biweekly"]).optional(),
  paydays: z.array(z.number().int().min(1).max(31)).optional(),
  cycleDurationDays: z.union([z.literal(15), z.literal(30)]).optional(),
});

export const step3Schema = z
  .object({
    allocationNeeds: z.number().int().min(0).max(100),
    allocationWants: z.number().int().min(0).max(100),
    allocationSavings: z.number().int().min(0).max(100),
  })
  .refine(
    (data) => data.allocationNeeds + data.allocationWants + data.allocationSavings === 100,
    { message: "El reparto debe sumar exactamente 100%.", path: ["allocations"] },
  );

export const finalPayloadSchema = z.object({
  name: z.string().optional(),
  country: z.string().default("Perú"),
  currencyCode: z.string().default("PEN"),
  currencySymbol: z.string().default("S/"),
  incomeModel: z.enum(["fixed", "variable", "mixed"]),
  payFrequency: z.enum(["monthly", "biweekly"]).optional(),
  paydays: z.array(z.number().int().min(1).max(31)).optional(),
  cycleDurationDays: z.union([z.literal(15), z.literal(30)]).optional(),
  mixedFixedAmount: z.number().int().min(0).optional(),
  allocationNeeds: z.number().int().min(0).max(100),
  allocationWants: z.number().int().min(0).max(100),
  allocationSavings: z.number().int().min(0).max(100),
});
