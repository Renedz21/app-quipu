import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WizardStepIncome } from "../wizard-step-income";
import { WizardStepReserved } from "../wizard-step-reserved";
import { WizardStepSplit } from "../wizard-step-split";

afterEach(cleanup);

describe("WizardStepIncome", () => {
  it("edita el monto y avanza", () => {
    const onAmountChange = vi.fn();
    const onNext = vi.fn();
    const view = render(
      <WizardStepIncome
        amountText=""
        currencyCode="PEN"
        onAmountChange={onAmountChange}
        onNext={onNext}
      />,
    );
    fireEvent.change(screen.getByLabelText(/ingresó|entró/i), {
      target: { value: "3800" },
    });
    expect(onAmountChange).toHaveBeenCalledWith("3800");
    view.rerender(
      <WizardStepIncome
        amountText="3800"
        currencyCode="PEN"
        onAmountChange={onAmountChange}
        onNext={onNext}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(onNext).toHaveBeenCalled();
  });

  it("bloquea continuar con monto inválido", () => {
    const onNext = vi.fn();
    render(
      <WizardStepIncome
        amountText=""
        currencyCode="PEN"
        onAmountChange={() => {}}
        onNext={onNext}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(onNext).not.toHaveBeenCalled();
  });
});

describe("WizardStepReserved", () => {
  const commitments = [
    { id: "c1", name: "Cuota auto", amount: 250_000 },
  ];

  it("muestra error cuando lo apartado supera el ingreso", () => {
    render(
      <WizardStepReserved
        incomeCents={380_000}
        reservedText="4000"
        reservedMode="existing"
        commitmentId="c1"
        newCommitment={{
          name: "",
          amountCents: 0,
          dueDay: 0,
        }}
        commitments={commitments}
        currencyCode="PEN"
        onReservedChange={() => {}}
        onModeChange={() => {}}
        onCommitmentChange={() => {}}
        onNewCommitmentChange={() => {}}
        onBack={() => {}}
        onNext={() => {}}
      />,
    );
    expect(
      screen.getByText(/no puede superar lo ingresado/i),
    ).toBeTruthy();
  });

  it("deshabilita continuar sin compromiso en modo existing", () => {
    render(
      <WizardStepReserved
        incomeCents={380_000}
        reservedText="2500"
        reservedMode="existing"
        commitmentId=""
        newCommitment={{
          name: "",
          amountCents: 0,
          dueDay: 0,
        }}
        commitments={commitments}
        currencyCode="PEN"
        onReservedChange={() => {}}
        onModeChange={() => {}}
        onCommitmentChange={() => {}}
        onNewCommitmentChange={() => {}}
        onBack={() => {}}
        onNext={() => {}}
      />,
    );
    expect(
      (screen.getByRole("button", { name: /continuar/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});

describe("WizardStepSplit", () => {
  const targets = { needs: 65_000, wants: 39_000, savings: 26_000 };

  it("stepper suma y muestra el restante vivo", () => {
    const onTargetChange = vi.fn();
    render(
      <WizardStepSplit
        freeCents={130_000}
        targets={targets}
        currencyCode="PEN"
        overrunWarning={null}
        onTargetChange={onTargetChange}
        onResetProposal={() => {}}
        onBack={() => {}}
        onSubmit={() => {}}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "+" })[0]);
    expect(onTargetChange).toHaveBeenCalledWith(
      "needs",
      65_000 + 10_000,
    );
    expect(screen.getByText(/te quedan/i)).toBeTruthy();
  });
});
