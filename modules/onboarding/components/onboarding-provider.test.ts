import { describe, expect, it } from "vitest";
import { INITIAL_ONBOARDING_STATE } from "../constants";
import type { OnboardingState } from "../types";
import { onboardingReducer } from "./onboarding-provider";

const baseState: OnboardingState = {
  ...INITIAL_ONBOARDING_STATE,
  name: "",
  incomeModel: null,
  payFrequency: null,
  paydays: [],
  allocationNeeds: 50,
  allocationWants: 30,
  allocationSavings: 20,
  commitments: [],
  workerType: null,
};

describe("onboardingReducer", () => {
  describe("UPDATE", () => {
    it("actualiza un campo de texto (name)", () => {
      const result = onboardingReducer(baseState, {
        type: "UPDATE",
        payload: { name: "Lucia" },
      });
      expect(result.name).toBe("Lucia");
    });

    it("actualiza incomeModel", () => {
      const result = onboardingReducer(baseState, {
        type: "UPDATE",
        payload: { incomeModel: "fixed" },
      });
      expect(result.incomeModel).toBe("fixed");
    });

    it("actualiza payFrequency y paydays juntos", () => {
      const result = onboardingReducer(baseState, {
        type: "UPDATE",
        payload: { payFrequency: "biweekly", paydays: [1, 15] },
      });
      expect(result.payFrequency).toBe("biweekly");
      expect(result.paydays).toEqual([1, 15]);
    });

    it("actualiza allocations (los 3 a la vez)", () => {
      const result = onboardingReducer(baseState, {
        type: "UPDATE",
        payload: {
          allocationNeeds: 60,
          allocationWants: 20,
          allocationSavings: 20,
        },
      });
      expect(result.allocationNeeds).toBe(60);
      expect(result.allocationWants).toBe(20);
      expect(result.allocationSavings).toBe(20);
    });

    it("reemplaza commitments (no mergea)", () => {
      const start: OnboardingState = {
        ...baseState,
        commitments: [
          {
            name: "Alquiler",
            amountCents: 1000,
            frequency: "monthly",
            envelope: "needs",
          },
        ],
      };
      const result = onboardingReducer(start, {
        type: "UPDATE",
        payload: {
          commitments: [
            {
              name: "Internet",
              amountCents: 100,
              frequency: "every_payday",
              envelope: "needs",
            },
            {
              name: "Spotify",
              amountCents: 30,
              frequency: "monthly",
              envelope: "wants",
            },
          ],
        },
      });
      expect(result.commitments).toHaveLength(2);
      expect(result.commitments[0]?.name).toBe("Internet");
    });
  });

  describe("SET_STEP", () => {
    it("cambia currentStep", () => {
      const result = onboardingReducer(baseState, {
        type: "SET_STEP",
        payload: 5,
      });
      expect(result.currentStep).toBe(5);
    });
  });

  describe("ADD_COMMITMENT", () => {
    it("agrega un commitment al final del array", () => {
      const result = onboardingReducer(baseState, {
        type: "ADD_COMMITMENT",
        payload: {
          name: "Alquiler",
          amountCents: 1000,
          frequency: "monthly",
          envelope: "needs",
        },
      });
      expect(result.commitments).toHaveLength(1);
      expect(result.commitments[0]?.name).toBe("Alquiler");
    });

    it("preserva los commitments existentes", () => {
      const start: OnboardingState = {
        ...baseState,
        commitments: [
          {
            name: "A",
            amountCents: 100,
            frequency: "monthly",
            envelope: "needs",
          },
        ],
      };
      const result = onboardingReducer(start, {
        type: "ADD_COMMITMENT",
        payload: {
          name: "B",
          amountCents: 200,
          frequency: "monthly",
          envelope: "wants",
        },
      });
      expect(result.commitments).toHaveLength(2);
      expect(result.commitments.map((c) => c.name)).toEqual(["A", "B"]);
    });
  });

  describe("REMOVE_COMMITMENT", () => {
    it("elimina el commitment en el índice dado", () => {
      const start: OnboardingState = {
        ...baseState,
        commitments: [
          {
            name: "A",
            amountCents: 100,
            frequency: "monthly",
            envelope: "needs",
          },
          {
            name: "B",
            amountCents: 200,
            frequency: "monthly",
            envelope: "wants",
          },
          {
            name: "C",
            amountCents: 300,
            frequency: "monthly",
            envelope: "needs",
          },
        ],
      };
      const result = onboardingReducer(start, {
        type: "REMOVE_COMMITMENT",
        payload: 1,
      });
      expect(result.commitments).toHaveLength(2);
      expect(result.commitments.map((c) => c.name)).toEqual(["A", "C"]);
    });
  });

  describe("RESET", () => {
    it("vuelve al state inicial", () => {
      const dirty: OnboardingState = {
        ...baseState,
        name: "Lucia",
        incomeModel: "fixed",
        currentStep: 5,
        commitments: [
          {
            name: "X",
            amountCents: 1,
            frequency: "monthly",
            envelope: "needs",
          },
        ],
      };
      const result = onboardingReducer(dirty, { type: "RESET" });
      expect(result).toEqual(baseState);
    });
  });
});
