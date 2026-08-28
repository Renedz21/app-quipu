import { describe, expect, it } from "vitest";
import {
  buildSimpleCorrectionPlan,
  proposeRemainingByEnvelope,
} from "../simple-correction-plan";

const ALLOCATION = { needs: 50, wants: 30, savings: 20 };

describe("proposeRemainingByEnvelope", () => {
  it("reparte el libre según los porcentajes", () => {
    expect(
      proposeRemainingByEnvelope({
        freeCents: 130_000,
        allocation: ALLOCATION,
        spentPerEnvelope: { needs: 0, wants: 0, savings: 0 },
      }),
    ).toEqual({ needs: 65_000, wants: 39_000, savings: 26_000 });
  });

  it("resta lo ya gastado y no baja de 0", () => {
    expect(
      proposeRemainingByEnvelope({
        freeCents: 130_000,
        allocation: ALLOCATION,
        spentPerEnvelope: { needs: 70_000, wants: 10_000, savings: 0 },
      }),
    ).toEqual({ needs: 0, wants: 29_000, savings: 26_000 });
  });

  it("con libre 0 todo queda en 0", () => {
    expect(
      proposeRemainingByEnvelope({
        freeCents: 0,
        allocation: ALLOCATION,
        spentPerEnvelope: { needs: 0, wants: 0, savings: 0 },
      }),
    ).toEqual({ needs: 0, wants: 0, savings: 0 });
  });
});

describe("buildSimpleCorrectionPlan", () => {
  const base = {
    incomeCents: 380_000,
    allocation: ALLOCATION,
    spentPerEnvelope: { needs: 0, wants: 0, savings: 0 },
    targets: { needs: 65_000, wants: 39_000, savings: 26_000 },
  };

  it("reserva a compromiso y deja el resto sin asignar en 0", () => {
    const result = buildSimpleCorrectionPlan({
      ...base,
      reservedWithCommitmentCents: 250_000,
      reservedGenericCents: 0,
      commitmentId: "c1",
    });
    expect(result.reserveToCommitments).toEqual([
      { commitmentId: "c1", amountCents: 250_000 },
    ]);
    expect(result.remainingByEnvelope).toEqual(base.targets);
    expect(result.unallocatedCents).toBe(0);
  });

  it("apartar sin compromiso va a por repartir", () => {
    const result = buildSimpleCorrectionPlan({
      ...base,
      reservedWithCommitmentCents: 0,
      reservedGenericCents: 250_000,
      commitmentId: null,
    });
    expect(result.reserveToCommitments).toEqual([]);
    expect(result.unallocatedCents).toBe(250_000);
  });

  it("el sobrante del reparto va a por repartir", () => {
    const result = buildSimpleCorrectionPlan({
      ...base,
      reservedWithCommitmentCents: 250_000,
      reservedGenericCents: 0,
      commitmentId: "c1",
      targets: { needs: 50_000, wants: 30_000, savings: 20_000 },
    });
    expect(result.unallocatedCents).toBe(30_000);
  });

  it("lanza si los objetivos superan el libre", () => {
    expect(() =>
      buildSimpleCorrectionPlan({
        ...base,
        reservedWithCommitmentCents: 250_000,
        reservedGenericCents: 0,
        commitmentId: "c1",
        targets: { needs: 200_000, wants: 0, savings: 0 },
      }),
    ).toThrow("Los sobres no pueden superar el dinero libre");
  });

  it("lanza si reservado supera el ingreso", () => {
    expect(() =>
      buildSimpleCorrectionPlan({
        ...base,
        reservedWithCommitmentCents: 400_000,
        reservedGenericCents: 0,
        commitmentId: "c1",
      }),
    ).toThrow("Lo apartado no puede superar lo ingresado");
  });
});
