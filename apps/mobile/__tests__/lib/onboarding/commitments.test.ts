import {
  commitmentErrorMessage,
  isCommitmentValid,
  isNamedChipTaken,
  validCommitmentsTotalCents,
} from "@/shared/lib/onboarding/commitments";
import type { DraftCommitment } from "@/shared/lib/onboarding/types";

function commitment(overrides: Partial<DraftCommitment> = {}): DraftCommitment {
  return {
    id: "c1",
    name: "Agua",
    amountCents: 110000,
    dueDay: 5,
    ...overrides,
  };
}

describe("isCommitmentValid", () => {
  it("válido con nombre, monto y día en rango", () => {
    expect(isCommitmentValid(commitment())).toBe(true);
  });

  it("inválido con nombre vacío o solo espacios", () => {
    expect(isCommitmentValid(commitment({ name: "" }))).toBe(false);
    expect(isCommitmentValid(commitment({ name: "   " }))).toBe(false);
  });

  it("inválido con monto 0", () => {
    expect(isCommitmentValid(commitment({ amountCents: 0 }))).toBe(false);
  });

  it("inválido con día fuera de 1..31", () => {
    expect(isCommitmentValid(commitment({ dueDay: 0 }))).toBe(false);
    expect(isCommitmentValid(commitment({ dueDay: 32 }))).toBe(false);
  });
});

describe("validCommitmentsTotalCents", () => {
  it("suma solo los compromisos válidos", () => {
    expect(
      validCommitmentsTotalCents([
        commitment({ id: "a", amountCents: 110000, dueDay: 5 }),
        commitment({ id: "b", amountCents: 16500, dueDay: 0 }),
        commitment({ id: "c", amountCents: 0 }),
      ]),
    ).toBe(110000);
  });

  it("lista vacía suma 0", () => {
    expect(validCommitmentsTotalCents([])).toBe(0);
  });
});

describe("isNamedChipTaken", () => {
  it("Agua no está tomada si no hay filas", () => {
    expect(isNamedChipTaken("Agua", [])).toBe(false);
  });

  it("Agua queda tomada si ya hay una fila Agua", () => {
    expect(isNamedChipTaken("Agua", [commitment({ name: "Agua" })])).toBe(true);
  });

  it("Agua no queda tomada por una fila Celular", () => {
    expect(isNamedChipTaken("Agua", [commitment({ name: "Celular" })])).toBe(
      false,
    );
  });

  it("Otro nunca queda tomado, aunque ya haya filas Otro", () => {
    expect(
      isNamedChipTaken("Otro", [
        commitment({ id: "a", name: "Otro" }),
        commitment({ id: "b", name: "Otro" }),
      ]),
    ).toBe(false);
  });

  it("compara el nombre sin importar mayúsculas ni espacios", () => {
    expect(isNamedChipTaken("Agua", [commitment({ name: "  agua  " })])).toBe(
      true,
    );
  });
});

describe("commitmentErrorMessage", () => {
  it("completo no tiene mensaje", () => {
    expect(commitmentErrorMessage(commitment())).toBeNull();
  });

  it("sin monto ni día", () => {
    expect(
      commitmentErrorMessage(commitment({ amountCents: 0, dueDay: 0 })),
    ).toBe("Falta el monto y el día.");
  });

  it("solo falta el monto", () => {
    expect(commitmentErrorMessage(commitment({ amountCents: 0 }))).toBe(
      "Falta el monto.",
    );
  });

  it("solo falta el día", () => {
    expect(commitmentErrorMessage(commitment({ dueDay: 0 }))).toBe(
      "Falta el día.",
    );
  });

  it("día fuera de rango", () => {
    expect(commitmentErrorMessage(commitment({ dueDay: 40 }))).toBe(
      "El día debe ser del 1 al 31.",
    );
  });

  it("falta el nombre", () => {
    expect(commitmentErrorMessage(commitment({ name: "  " }))).toBe(
      "Falta el nombre.",
    );
  });
});
