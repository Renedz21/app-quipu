/**
 * Regresión: cerrar tras un update deja el sheet en detalle (reset en el
 * handler de cierre), sin remount por key — así Base UI anima la entrada.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MovementForDetail } from "../movement-detail-sheet";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/core/analytics", () => ({
  AnalyticsEvents: {
    MOVEMENT_DELETED: "movement_deleted",
    ALLOCATION_CORRECT_CTA_CLICKED: "allocation_correct_cta_clicked",
    INCOME_EVENT_UPDATED: "income_event_updated",
  },
  track: vi.fn(),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("../expense-edit-form", () => ({
  ExpenseEditForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>
      Guardar gasto
    </button>
  ),
}));

vi.mock("../income-edit-form", () => ({
  IncomeEditForm: () => null,
}));

const { MovementDetailSheet } = await import("../movement-detail-sheet");

const expenseA: MovementForDetail = {
  id: "expense-a",
  kind: "expense",
  label: "Café",
  amount: 500,
  timestamp: 1_700_000_000_000,
  envelopeType: "wants",
};

const expenseB: MovementForDetail = {
  id: "expense-b",
  kind: "expense",
  label: "Almuerzo",
  amount: 1500,
  timestamp: 1_700_000_100_000,
  envelopeType: "needs",
};

afterEach(() => {
  cleanup();
});

describe("MovementDetailSheet", () => {
  it("al reabrir el mismo movimiento tras success muestra el detalle", () => {
    const { rerender } = render(
      <MovementDetailSheet
        open
        onOpenChange={(next) => {
          rerender(
            <MovementDetailSheet
              open={next}
              onOpenChange={() => undefined}
              movement={expenseA}
            />,
          );
        }}
        movement={expenseA}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    expect(screen.getByText("Listo")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    rerender(
      <MovementDetailSheet
        open
        onOpenChange={() => undefined}
        movement={expenseA}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Detalle del movimiento" }),
    ).toBeTruthy();
    expect(screen.queryByText("Listo")).toBeNull();
  });

  it("tras cerrar success, abrir otro movimiento muestra su detalle", () => {
    const { rerender } = render(
      <MovementDetailSheet
        open
        onOpenChange={(next) => {
          rerender(
            <MovementDetailSheet
              open={next}
              onOpenChange={() => undefined}
              movement={expenseA}
            />,
          );
        }}
        movement={expenseA}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    rerender(
      <MovementDetailSheet
        open
        onOpenChange={() => undefined}
        movement={expenseB}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Detalle del movimiento" }),
    ).toBeTruthy();
    expect(screen.queryByText("Listo")).toBeNull();
    expect(screen.getByText("Almuerzo")).toBeTruthy();
  });
});
