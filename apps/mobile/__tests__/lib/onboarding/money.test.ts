import {
  formatCentsForInput,
  parseSolesToCents,
  sanitizeSolesInput,
} from "@/shared/lib/onboarding/money";

describe("sanitizeSolesInput", () => {
  it("deja 39.99", () => {
    expect(sanitizeSolesInput("39.99")).toBe("39.99");
  });

  it("normaliza 39,99 a 39.99", () => {
    expect(sanitizeSolesInput("39,99")).toBe("39.99");
  });

  it("conserva el punto mientras se escribe 39.", () => {
    expect(sanitizeSolesInput("39.")).toBe("39.");
  });

  it("corta a 2 decimales", () => {
    expect(sanitizeSolesInput("39.999")).toBe("39.99");
  });

  it("1,100 con 3 dígitos es miles, no decimal", () => {
    expect(sanitizeSolesInput("1,100")).toBe("1100");
  });
});

describe("parseSolesToCents", () => {
  it("39.99 → 3999 céntimos", () => {
    expect(parseSolesToCents("39.99")).toBe(3999);
  });

  it("39,99 → 3999 céntimos", () => {
    expect(parseSolesToCents("39,99")).toBe(3999);
  });

  it("1100 → 110000 céntimos", () => {
    expect(parseSolesToCents("1100")).toBe(110000);
  });

  it("vacío o punto suelto → 0", () => {
    expect(parseSolesToCents("")).toBe(0);
    expect(parseSolesToCents(".")).toBe(0);
  });

  it("39.9 → 3990 céntimos", () => {
    expect(parseSolesToCents("39.9")).toBe(3990);
  });
});

describe("formatCentsForInput", () => {
  it("0 → vacío", () => {
    expect(formatCentsForInput(0)).toBe("");
  });

  it("110000 → 1100", () => {
    expect(formatCentsForInput(110000)).toBe("1100");
  });

  it("3999 → 39.99", () => {
    expect(formatCentsForInput(3999)).toBe("39.99");
  });

  it("3900 → 39", () => {
    expect(formatCentsForInput(3900)).toBe("39");
  });
});
