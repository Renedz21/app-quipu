import { api } from "@/convex/_generated/api";
import { expect, test } from "./fixtures/smoke";
import {
  applyCoverFromCycleSavings,
  applyRescueTransfer,
  dismissRescueSuggestion,
  getDashboardCoach,
  getEnvelopeBalances,
  postponeCommitmentForCycle,
  registerWantsExpense,
  resolveCoachInteraction,
  seedActiveCycle,
  seedCrisisFromFailedCompliance,
  seedCrisisFromUncoveredCommitment,
  seedOnboardedUser,
  seedWarningCoachState,
  snoozeCrisisCoach,
  createFixedCommitment,
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

  test("registrar ingreso desde empty state activa ciclo", {
    tag: "@smoke",
  }, async ({ authedPage, convexClient }) => {
    await seedOnboardedUser(convexClient);

    await authedPage.goto("/dashboard");
    await authedPage.getByRole("link", { name: "Registrar ingreso" }).click();

    await expect(
      authedPage.getByRole("heading", { name: "Registrar ingreso" }),
    ).toBeVisible();
    await expect(authedPage.getByText("Impacto en tus sobres")).toBeVisible();

    await authedPage.getByRole("button", { name: "9" }).click();
    await authedPage.getByRole("button", { name: "0" }).click();
    await authedPage.getByRole("button", { name: "0" }).click();
    await authedPage.getByRole("button", { name: "Registrar ingreso" }).click();

    await expect(authedPage.getByText("Ingreso registrado")).toBeVisible({
      timeout: 15_000,
    });
    await expect(authedPage.getByText(/Disponible hoy ahora/)).toBeVisible();
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

  test("registrar gasto desde UI abre flujo y confirma", {
    tag: "@smoke",
  }, async ({ authedPage, convexClient }) => {
    await seedOnboardedUser(convexClient);
    await seedActiveCycle(convexClient, 100_000);

    await authedPage.goto("/dashboard");

    await authedPage.getByRole("button", { name: "Registrar" }).first().click();

    await expect(authedPage.getByText("Nuevo gasto")).toBeVisible();
    await expect(authedPage.getByText("S/ 0.00")).toBeVisible();

    await authedPage.getByRole("button", { name: "4" }).click();
    await authedPage.getByRole("button", { name: "8" }).click();
    await authedPage.getByRole("button", { name: "Siguiente →" }).click();

    await expect(
      authedPage.getByRole("heading", { name: "¿De qué sobre sale?" }),
    ).toBeVisible();

    await authedPage
      .getByRole("button", { name: /Confirmar en Gustos/ })
      .click();

    await expect(authedPage.getByText("Gasto registrado")).toBeVisible({
      timeout: 15_000,
    });
    await expect(authedPage.getByText(/Te quedan/)).toBeVisible();
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

  test("warning coach CTA Ajustar ciclo navega a registrar ingreso", {
    tag: "@smoke",
  }, async ({ authedPage, convexClient }) => {
    await seedOnboardedUser(convexClient);
    await seedWarningCoachState(convexClient);

    await authedPage.goto("/dashboard");

    await expect(authedPage.getByText("Advertencia")).toBeVisible();
    await authedPage.getByRole("button", { name: "Ajustar ciclo" }).click();

    await expect(authedPage).toHaveURL(/\/income\/register$/);
    await expect(
      authedPage.getByRole("heading", { name: "Registrar ingreso" }),
    ).toBeVisible();
  });

  test("snoozeCrisisCoach degrada crisis a advertencia", {
    tag: "@smoke",
  }, async ({ convexClient }) => {
    await seedOnboardedUser(convexClient);
    await seedCrisisFromFailedCompliance(convexClient);

    const before = await getDashboardCoach(convexClient);
    expect(before?.kind).toBe("crisis");

    const result = await snoozeCrisisCoach(convexClient);
    expect(result.success).toBe(true);

    const after = await getDashboardCoach(convexClient);
    expect(after?.kind).toBe("warning");
  });

  test("applyCoverFromCycleSavings mueve saldo de Ahorro a Necesidades", {
    tag: "@smoke",
  }, async ({ convexClient }) => {
    await seedOnboardedUser(convexClient);
    await seedCrisisFromUncoveredCommitment(convexClient);

    const beforeCoach = await getDashboardCoach(convexClient);
    expect(beforeCoach?.kind).toBe("crisis");
    expect(beforeCoach?.crisisOptions?.some((o) => o.id === "cover_from_savings")).toBe(
      true,
    );

    const beforeBalances = await getEnvelopeBalances(convexClient);
    expect(beforeBalances?.savings).toBeGreaterThan(0);

    const result = await applyCoverFromCycleSavings(convexClient);
    expect(result.success).toBe(true);
    expect(result.transferTotal).toBeGreaterThan(0);

    const afterBalances = await getEnvelopeBalances(convexClient);
    expect(afterBalances?.savings).toBe(
      (beforeBalances?.savings ?? 0) - (result.transferTotal ?? 0),
    );
    expect(afterBalances?.needs).toBe(
      (beforeBalances?.needs ?? 0) + (result.needsBoost ?? 0),
    );
  });

  test("postponeCommitmentForCycle libera compromiso wants descubierto", {
    tag: "@smoke",
  }, async ({ convexClient }) => {
    await seedOnboardedUser(convexClient);
    const commitmentId = await createFixedCommitment(convexClient, {
      name: "Spotify smoke",
      amount: 35_000,
      envelope: "wants",
      dueDay: 18,
    });
    await seedActiveCycle(convexClient, 100_000);
    await registerWantsExpense(convexClient, 100, "Smoke exit early cycle");

    const beforeCoach = await getDashboardCoach(convexClient);
    expect(beforeCoach?.kind).toBe("crisis");
    const postponeOption = beforeCoach?.crisisOptions?.find((option) =>
      option.id.startsWith("postpone_"),
    );
    expect(postponeOption?.commitmentId).toBe(commitmentId);

    const result = await postponeCommitmentForCycle(convexClient, commitmentId);
    expect(result.success).toBe(true);
    expect(result.freedAmount).toBeGreaterThan(0);

    const afterCoach = await getDashboardCoach(convexClient);
    expect(afterCoach?.kind).not.toBe("crisis");
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

  test("pantalla Tu progreso carga tras onboarding", {
    tag: "@smoke",
  }, async ({ authedPage, convexClient }) => {
    await seedOnboardedUser(convexClient);

    await authedPage.goto("/progress");

    await expect(
      authedPage.getByRole("heading", { name: "Tu progreso" }),
    ).toBeVisible();
    await expect(
      authedPage.getByText(/La constancia también se construye/),
    ).toBeVisible();
  });

  test("pantalla Ajustes carga tras onboarding", {
    tag: "@smoke",
  }, async ({ authedPage, convexClient }) => {
    await seedOnboardedUser(convexClient);

    await authedPage.goto("/settings");

    await expect(
      authedPage.getByRole("heading", { name: "Ajustes" }),
    ).toBeVisible();
  });

  test("pantalla Movimientos carga tras onboarding", {
    tag: "@smoke",
  }, async ({ authedPage, convexClient }) => {
    await seedOnboardedUser(convexClient);

    await authedPage.goto("/movements");

    await expect(
      authedPage.getByRole("heading", { name: "Movimientos" }),
    ).toBeVisible();
    await expect(
      authedPage.getByText(/Ingresos y gastos de tu ciclo activo/),
    ).toBeVisible();
  });
});
