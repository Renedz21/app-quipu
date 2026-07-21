import { api } from "@/convex/_generated/api";
import { expect, test } from "./fixtures/smoke";
import {
  applyRescueTransfer,
  dismissRescueSuggestion,
  getEnvelopeBalances,
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

  test("dashboard muestra estado temprano con ciclo activo sin gastos", {
    tag: "@smoke",
  }, async ({ authedPage, convexClient }) => {
    await seedOnboardedUser(convexClient);
    await seedActiveCycle(convexClient, 100_000);

    await authedPage.goto("/dashboard");

    await expect(authedPage.getByText("Recién empiezas")).toBeVisible();
    await expect(
      authedPage.getByText(/Tu presupuesto ya está repartido en sobres/),
    ).toBeVisible();
    await expect(authedPage.getByText("Contigo")).toBeVisible();
    await expect(
      authedPage.getByText(/Tu primer movimiento aparecerá aquí/),
    ).toBeVisible();
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

  test("applyRescueTransfer mueve saldo de Ahorro a Gustos tras confirmación", {
    tag: "@smoke",
  }, async ({ convexClient }) => {
    await seedOnboardedUser(convexClient, { plan: "premium" });
    await seedActiveCycle(convexClient, 100_000);
    await registerWantsExpense(convexClient, 35_000, "Smoke overspend wants");

    const nudge = await convexClient.query(api.coachEngine.getActiveNudge, {});
    expect(nudge).not.toBeNull();
    if (!nudge) throw new Error("Expected pending coach interaction.");

    const beforeBalances = await getEnvelopeBalances(convexClient);
    expect(beforeBalances?.wants).toBeLessThan(0);
    expect(beforeBalances?.savings).toBeGreaterThan(0);

    const suggestionResult = await resolveCoachInteraction(
      convexClient,
      nudge._id,
      "suggest_rescue",
    );
    expect(suggestionResult.mode).toBe("suggested");
    expect(suggestionResult.suggestion?.transfer).toBeGreaterThan(0);

    const applyResult = await applyRescueTransfer(convexClient, nudge._id);
    expect(applyResult.success).toBe(true);
    expect(applyResult.transfer).toBe(suggestionResult.suggestion?.transfer);

    const afterBalances = await getEnvelopeBalances(convexClient);
    expect(afterBalances?.savings).toBe(
      (beforeBalances?.savings ?? 0) - (applyResult.transfer ?? 0),
    );
    expect(afterBalances?.wants).toBe(
      (beforeBalances?.wants ?? 0) + (applyResult.transfer ?? 0),
    );

    const afterNudge = await convexClient.query(
      api.coachEngine.getActiveNudge,
      {},
    );
    expect(afterNudge).toBeNull();
  });

  test("dismissRescueSuggestion no modifica sobres", {
    tag: "@smoke",
  }, async ({ convexClient }) => {
    await seedOnboardedUser(convexClient, { plan: "premium" });
    await seedActiveCycle(convexClient, 100_000);
    await registerWantsExpense(convexClient, 35_000, "Smoke overspend dismiss");

    const nudge = await convexClient.query(api.coachEngine.getActiveNudge, {});
    expect(nudge).not.toBeNull();
    if (!nudge) throw new Error("Expected pending coach interaction.");

    const beforeBalances = await getEnvelopeBalances(convexClient);

    await resolveCoachInteraction(convexClient, nudge._id, "suggest_rescue");
    await dismissRescueSuggestion(convexClient, nudge._id);

    const afterBalances = await getEnvelopeBalances(convexClient);
    expect(afterBalances).toEqual(beforeBalances);

    const afterNudge = await convexClient.query(
      api.coachEngine.getActiveNudge,
      {},
    );
    expect(afterNudge).toBeNull();
  });
});
