import { z } from "zod";

export const createSpaceInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  expectedContributionCents: z.number().int().min(0).optional(),
});

export const spaceNameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(80, "Máximo 80 caracteres.");

export const spaceAllocationSchema = z
  .object({
    allocationNeeds: z.number().int().min(0).max(100),
    allocationWants: z.number().int().min(0).max(100),
    allocationSavings: z.number().int().min(0).max(100),
    effectiveOn: z.enum(["current_cycle", "next_cycle"]),
  })
  .refine(
    (data) =>
      data.allocationNeeds + data.allocationWants + data.allocationSavings ===
      100,
    {
      message: "El reparto debe sumar exactamente 100%.",
      path: ["allocations"],
    },
  );

export const expectedContributionSchema = z.object({
  profileId: z.string(),
  expectedContributionCents: z.number().int().min(0),
  effectiveOn: z.enum(["current_cycle", "next_cycle"]),
});

export const cycleDurationSchema = z.object({
  cycleDurationDays: z.union([z.literal(15), z.literal(30)]),
  effectiveOn: z.enum(["current_cycle", "next_cycle"]),
});

export const effectiveOnSchema = z.enum(["current_cycle", "next_cycle"]);

export const contributeInputSchema = z.object({
  spaceId: z.string(),
  amountCents: z.number().int().positive(),
  personalEnvelopeType: z.enum(["needs", "wants", "savings"]),
  spaceEnvelopeType: z.enum(["needs", "wants", "savings"]),
});

export const spaceExpenseInputSchema = z.object({
  spaceId: z.string(),
  amount: z.number().int().positive(),
  description: z.string().trim().min(1),
  envelopeType: z.enum(["needs", "wants", "savings"]),
  fundingSource: z.enum(["space_budget", "personal_pocket"]),
});
