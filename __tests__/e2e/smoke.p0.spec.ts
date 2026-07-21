import { api } from "@/convex/_generated/api";
import { expect, test } from "./fixtures/smoke";
import {
  registerWantsExpense,
  resolveCoachInteraction,
  seedActiveCycle,
  seedOnboardedUser,
} from "./helpers/convex-client";

test.describe("P0 smoke @smoke", () => {
  test("dashboard carga para usuario con profile", { tag: "@smoke" }, async ({
    authedPage,
    convexClient,
  }) => {
    await seedOnboardedUser(convexClient);

    const consoleErrors: string[] = [];
    authedPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await authedPage.goto("/dashboard");

    await expect(
      authedPage.getByRole("heading", { name: /Hola,/ }),
    ).toBeVisible();
    await expect(
      authedPage.getByRole("heading", { name: /Tu sistema está listo/ }),
    ).toBeVisible();

    const hydrationErrors = consoleErrors.filter(
      (e) =>
        e.includes("Hydration") ||
        e.includes("hydration") ||
        e.includes("did not match"),
    );
    expect(hydrationErrors).toEqual([]);
  });

  test("getMyProfile responde sin error para usuario autenticado", {
    tag: "@smoke",
  }, async ({ convexClient }) => {
    await seedOnboardedUser(convexClient);

    const profile = await convexClient.query(api.profiles.getMyProfile, {});
    expect(profile).not.toBeNull();
    expect(profile?.incomeModel).toBe("fixed");
    expect(profile?.onboardingComplete).toBe(true);
    expect(profile?.currencyCode).toBe("PEN");
  });

  test("registrar gasto baja el saldo del sobre Gustos", {
    tag: "@smoke",
  }, async ({ convexClient }) => {
    await seedOnboardedUser(convexClient);
    await seedActiveCycle(convexClient, 100_000);

    const expenseId = await registerWantsExpense(
      convexClient,
      5_000,
      "Almuerzo smoke",
    );
    expect(expenseId).toBeTruthy();

    const recent = await convexClient.query(api.expenses.getRecentExpenses, {});
    expect(recent.some((e) => e.description === "Almuerzo smoke")).toBe(true);

    await registerWantsExpense(convexClient, 15_000, "Smoke burn 2");
    const nudge = await convexClient.query(api.coachEngine.getActiveNudge, {});
    expect(nudge?.triggerEvent).toBe("WANTS_OVERFLOW_60");
    expect(nudge?.status).toBe("pending");
  });

  test("resolver coachInteraction marca la interacción como resuelta", {
    tag: "@smoke",
  }, async ({ convexClient }) => {
    await seedOnboardedUser(convexClient);
    await seedActiveCycle(convexClient, 100_000);
    await registerWantsExpense(convexClient, 12_000, "Smoke burn 1");
    await registerWantsExpense(convexClient, 10_000, "Smoke burn 2");

    const nudge = await convexClient.query(api.coachEngine.getActiveNudge, {});
    expect(nudge).not.toBeNull();
    if (!nudge) throw new Error("Expected pending coach interaction.");

    const result = await resolveCoachInteraction(
      convexClient,
      nudge._id,
      "ignore",
    );
    expect(result.success).toBe(true);

    const after = await convexClient.query(api.coachEngine.getActiveNudge, {});
    expect(after).toBeNull();
  });
});
