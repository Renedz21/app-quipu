import { describe, expect, it } from "vitest";
import { finalPayloadSchema } from "../modules/onboarding/schemas";

const BASE = {
  incomeModel: "fixed",
  country: "Perú",
  currencyCode: "PEN",
  currencySymbol: "S/",
  allocationNeeds: 50,
  allocationWants: 30,
  allocationSavings: 20,
};

describe("finalPayloadSchema", () => {
  it("accepts undefined for optional fields", () => {
    const result = finalPayloadSchema.safeParse({
      ...BASE,
      payFrequency: undefined,
      paydays: undefined,
      cycleDurationDays: undefined,
      mixedFixedAmount: undefined,
      variableIncomeSources: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("rejects null for payFrequency (Zod optional != nullable)", () => {
    const result = finalPayloadSchema.safeParse({ ...BASE, payFrequency: null });
    expect(result.success).toBe(false);
  });

  it("rejects null for paydays", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, paydays: null }).success).toBe(false);
  });

  it("rejects null for cycleDurationDays", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, cycleDurationDays: null }).success).toBe(false);
  });

  it("rejects null for mixedFixedAmount", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, mixedFixedAmount: null }).success).toBe(false);
  });

  it("rejects null for variableIncomeSources", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, variableIncomeSources: null }).success).toBe(false);
  });

  it("rejects payFrequency outside enum", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, payFrequency: "weekly" }).success).toBe(false);
  });

  it("rejects paydays with values out of 1-31", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, paydays: [32] }).success).toBe(false);
    expect(finalPayloadSchema.safeParse({ ...BASE, paydays: [0] }).success).toBe(false);
  });

  it("rejects cycleDurationDays other than 15 or 30", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, cycleDurationDays: 7 }).success).toBe(false);
    expect(finalPayloadSchema.safeParse({ ...BASE, cycleDurationDays: 45 }).success).toBe(false);
  });

  it("accepts cycleDurationDays of 15 or 30", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, cycleDurationDays: 15 }).success).toBe(true);
    expect(finalPayloadSchema.safeParse({ ...BASE, cycleDurationDays: 30 }).success).toBe(true);
  });

  it("rejects mixedFixedAmount negative", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, mixedFixedAmount: -1 }).success).toBe(false);
  });

  it("accepts mixedFixedAmount as integer cents", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, mixedFixedAmount: 350000 }).success).toBe(true);
  });

  it("accepts variableIncomeSources array", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, variableIncomeSources: ["proyectos", "ventas"] }).success).toBe(true);
  });

  it("rejects variableIncomeSources with empty strings", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, variableIncomeSources: [""] }).success).toBe(false);
  });

  it("rejects variableIncomeSources with names over 30 chars", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, variableIncomeSources: ["a".repeat(31)] }).success).toBe(false);
  });

  it("rejects allocations that don't sum to 100", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, allocationNeeds: 60, allocationWants: 30, allocationSavings: 20 }).success).toBe(false);
    expect(finalPayloadSchema.safeParse({ ...BASE, allocationNeeds: 50, allocationWants: 40, allocationSavings: 20 }).success).toBe(false);
  });

  it("accepts non-default allocations that sum to 100", () => {
    expect(finalPayloadSchema.safeParse({ ...BASE, allocationNeeds: 60, allocationWants: 20, allocationSavings: 20 }).success).toBe(true);
  });
});
