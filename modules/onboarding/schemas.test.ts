import { describe, expect, it } from "vitest";
import {
  commitmentDraftSchema,
  finalPayloadSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  step5Schema,
  step6Schema,
} from "./schemas";

describe("onboarding schemas", () => {
  describe("step1Schema (name)", () => {
    it("acepta nombre válido", () => {
      const result = step1Schema.safeParse({ name: "Lucia" });
      expect(result.success).toBe(true);
    });

    it("trim de espacios antes de validar", () => {
      const result = step1Schema.safeParse({ name: "  Lucia  " });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.name).toBe("Lucia");
    });

    it("rechaza nombre vacío", () => {
      const result = step1Schema.safeParse({ name: "   " });
      expect(result.success).toBe(false);
    });

    it("rechaza nombre de más de 60 caracteres", () => {
      const result = step1Schema.safeParse({ name: "a".repeat(61) });
      expect(result.success).toBe(false);
    });

    it("acepta nombre justo en el límite (60 chars)", () => {
      const result = step1Schema.safeParse({ name: "a".repeat(60) });
      expect(result.success).toBe(true);
    });
  });

  describe("step2Schema (incomeModel)", () => {
    it.each([
      "fixed",
      "variable",
      "mixed",
    ] as const)("acepta incomeModel válido: %s", (value) => {
      const result = step2Schema.safeParse({ incomeModel: value });
      expect(result.success).toBe(true);
    });

    it("rechaza incomeModel inválido", () => {
      const result = step2Schema.safeParse({ incomeModel: "weird" });
      expect(result.success).toBe(false);
    });
  });

  describe("step3Schema (frequency + paydays)", () => {
    it("monthly: acepta 1 día", () => {
      const result = step3Schema.safeParse({
        payFrequency: "monthly",
        paydays: [15],
      });
      expect(result.success).toBe(true);
    });

    it("monthly: rechaza 0 días", () => {
      const result = step3Schema.safeParse({
        payFrequency: "monthly",
        paydays: [],
      });
      expect(result.success).toBe(false);
    });

    it("biweekly: acepta 2 días", () => {
      const result = step3Schema.safeParse({
        payFrequency: "biweekly",
        paydays: [1, 15],
      });
      expect(result.success).toBe(true);
    });

    it("biweekly: rechaza 1 solo día", () => {
      const result = step3Schema.safeParse({
        payFrequency: "biweekly",
        paydays: [15],
      });
      expect(result.success).toBe(false);
    });

    it("weekly: acepta 1 día", () => {
      const result = step3Schema.safeParse({
        payFrequency: "weekly",
        paydays: [15],
      });
      expect(result.success).toBe(true);
    });

    it("variable: acepta array vacío (el usuario anota manualmente)", () => {
      const result = step3Schema.safeParse({
        payFrequency: "variable",
        paydays: [],
      });
      expect(result.success).toBe(true);
    });

    it("rechaza día fuera de 1-31", () => {
      const result = step3Schema.safeParse({
        payFrequency: "monthly",
        paydays: [0],
      });
      expect(result.success).toBe(false);

      const result2 = step3Schema.safeParse({
        payFrequency: "monthly",
        paydays: [32],
      });
      expect(result2.success).toBe(false);
    });

    it("rechaza día no entero", () => {
      const result = step3Schema.safeParse({
        payFrequency: "monthly",
        paydays: [15.5],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("step5Schema (allocations)", () => {
    it("acepta 50/30/20", () => {
      const result = step5Schema.safeParse({
        allocationNeeds: 50,
        allocationWants: 30,
        allocationSavings: 20,
      });
      expect(result.success).toBe(true);
    });

    it("rechaza si no suma 100", () => {
      const result = step5Schema.safeParse({
        allocationNeeds: 50,
        allocationWants: 30,
        allocationSavings: 10,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza negativos", () => {
      const result = step5Schema.safeParse({
        allocationNeeds: -10,
        allocationWants: 50,
        allocationSavings: 60,
      });
      expect(result.success).toBe(false);
    });

    it("rechaza valores > 100", () => {
      const result = step5Schema.safeParse({
        allocationNeeds: 150,
        allocationWants: 0,
        allocationSavings: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("step6Schema (commitments)", () => {
    it("acepta array vacío (usuario salteó el paso)", () => {
      const result = step6Schema.safeParse({ commitments: [] });
      expect(result.success).toBe(true);
    });

    it("acepta un commitment válido", () => {
      const result = step6Schema.safeParse({
        commitments: [
          {
            name: "Alquiler",
            amountCents: 150000,
            dueDay: 15,
            envelope: "needs",
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rechaza commitment con monto 0 o negativo", () => {
      const result = step6Schema.safeParse({
        commitments: [
          {
            name: "X",
            amountCents: 0,
            dueDay: 15,
            envelope: "needs",
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rechaza commitment con nombre vacío", () => {
      const result = step6Schema.safeParse({
        commitments: [
          {
            name: "   ",
            amountCents: 100,
            dueDay: 15,
            envelope: "needs",
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rechaza commitment con envelope inválido (savings no aplica)", () => {
      const result = step6Schema.safeParse({
        commitments: [
          {
            name: "X",
            amountCents: 100,
            dueDay: 15,
            envelope: "savings",
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rechaza dueDay fuera de 1-31", () => {
      expect(
        step6Schema.safeParse({
          commitments: [
            { name: "X", amountCents: 100, dueDay: 0, envelope: "needs" },
          ],
        }).success,
      ).toBe(false);
      expect(
        step6Schema.safeParse({
          commitments: [
            { name: "X", amountCents: 100, dueDay: 32, envelope: "needs" },
          ],
        }).success,
      ).toBe(false);
    });

    it("rechaza dueDay no entero", () => {
      const result = step6Schema.safeParse({
        commitments: [
          { name: "X", amountCents: 100, dueDay: 15.5, envelope: "needs" },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("commitmentDraftSchema (reusable)", () => {
    it("exporta el schema individual", () => {
      // Importante: step6Schema es array de este. Si el individual
      // cambia, los tests de step6 lo cubren.
      const result = commitmentDraftSchema.safeParse({
        name: "Internet",
        amountCents: 9990,
        dueDay: 15,
        envelope: "needs",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("finalPayloadSchema", () => {
    it("acepta payload completo válido", () => {
      const result = finalPayloadSchema.safeParse({
        name: "Lucia",
        incomeModel: "fixed",
        payFrequency: "biweekly",
        paydays: [1, 15],
        allocationNeeds: 50,
        allocationWants: 30,
        allocationSavings: 20,
        commitments: [],
        country: "Perú",
        currencyCode: "PEN",
        currencySymbol: "S/",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza payload con allocations que no suman 100", () => {
      const result = finalPayloadSchema.safeParse({
        name: "Lucia",
        incomeModel: "fixed",
        payFrequency: "biweekly",
        paydays: [1, 15],
        allocationNeeds: 50,
        allocationWants: 30,
        allocationSavings: 10,
        commitments: [],
      });
      expect(result.success).toBe(false);
    });

    it("rechaza payload con biweekly + 1 solo día", () => {
      const result = finalPayloadSchema.safeParse({
        name: "Lucia",
        incomeModel: "fixed",
        payFrequency: "biweekly",
        paydays: [15],
        allocationNeeds: 50,
        allocationWants: 30,
        allocationSavings: 20,
        commitments: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
