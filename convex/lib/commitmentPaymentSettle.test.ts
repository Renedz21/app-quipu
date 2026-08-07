import { describe, expect, it } from "vitest";
import { applyPayFromReservations } from "./commitmentReservation";

/**
 * Glue contract for markCommitmentAsPaid fail-closed:
 * remainder after reservations must be checkable before marking Pagado.
 */
describe("markCommitmentAsPaid settlement precheck", () => {
  it("reports remainder when reservations do not cover the due amount", () => {
    const pay = applyPayFromReservations({
      dueCents: 250_000,
      reservations: [
        {
          id: "r1",
          reservedCents: 100_000,
          consumedCents: 0,
          releasedCents: 0,
          status: "active",
        },
      ],
    });

    expect(pay.fromReserveCents).toBe(100_000);
    expect(pay.remainderCents).toBe(150_000);
  });

  it("has zero remainder when reservations fully cover the due amount", () => {
    const pay = applyPayFromReservations({
      dueCents: 250_000,
      reservations: [
        {
          id: "r1",
          reservedCents: 250_000,
          consumedCents: 0,
          releasedCents: 0,
          status: "active",
        },
      ],
    });

    expect(pay.remainderCents).toBe(0);
  });

  it("treats insufficient envelope as fail-closed when remainder exceeds remaining", () => {
    const pay = applyPayFromReservations({
      dueCents: 250_000,
      reservations: [],
    });
    const envelopeRemaining = 100_000;
    const canSettle =
      pay.remainderCents === 0 || envelopeRemaining >= pay.remainderCents;

    expect(canSettle).toBe(false);
  });
});
