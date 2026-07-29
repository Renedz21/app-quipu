import { describe, expect, it, vi } from "vitest";
import { handleRescueApply } from "../handle-rescue-apply";

describe("handleRescueApply", () => {
  const interactionId = "interaction_123" as never;

  it("returns 'applied' on success", async () => {
    const applyRescue = vi.fn().mockResolvedValue({
      success: true,
      transfer: 12_000,
      savingsRemaining: 8_000,
      wantsRemaining: 4_000,
    });
    const result = await handleRescueApply({ applyRescue, interactionId });
    expect(result).toEqual({
      kind: "applied",
      transfer: 12_000,
      savingsRemaining: 8_000,
      wantsRemaining: 4_000,
    });
    expect(applyRescue).toHaveBeenCalledWith({ interactionId });
  });

  it("returns 'paywall_required' when Convex throws PLAN_REQUIRED", async () => {
    const applyRescue = vi.fn().mockRejectedValue({
      data: {
        code: "PLAN_REQUIRED",
        message: "Esta función es parte de Quipu Plus.",
      },
    });
    const result = await handleRescueApply({ applyRescue, interactionId });
    expect(result).toEqual({ kind: "paywall_required" });
  });

  it("returns 'error' for any other thrown error", async () => {
    const applyRescue = vi.fn().mockRejectedValue({
      data: {
        code: "INSUFFICIENT_FUNDS",
        message: "Saldo insuficiente en Ahorro",
      },
    });
    const result = await handleRescueApply({ applyRescue, interactionId });
    expect(result).toEqual({
      kind: "error",
      code: "INSUFFICIENT_FUNDS",
      message: "Saldo insuficiente en Ahorro",
    });
  });

  it("returns 'error' for an unknown error shape (network, etc.)", async () => {
    const applyRescue = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await handleRescueApply({ applyRescue, interactionId });
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.code).toBe("INTERNAL_ERROR");
    }
  });
});
