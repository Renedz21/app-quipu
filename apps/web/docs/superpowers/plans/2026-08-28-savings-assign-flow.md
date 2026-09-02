# Asistente de destino del ahorro — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando haya saldo sin asignar en el sobre de ahorro del ciclo, un asistente (Sheet/Dialog en `/savings`) propone un reparto editable hacia Fondo y metas, calculado según el estado del usuario, con confirmación única y atómica.

**Architecture:** Lib pura `savingsAssignPlan.ts` (motor de sugerencia + validación de líneas, TDD) consumida por `getSavingsOverview`; mutación nueva `assignSavingsEnvelope` transaccional en `convex/savings.ts`; UI en `modules/savings/` reutilizando `SavingsFormShell`, keypad y patrón de `ContributeGoalDialog`; nudge del coach reutilizando la presentación existente.

**Tech Stack:** Convex + TypeScript + Vitest, Next.js 16 (app router), TanStack Form + zod (patrón existente en savings), Tailwind tokens §3.3.

**Spec:** `docs/superpowers/specs/2026-08-28-savings-assign-flow-design.md`

## Global Constraints

- Dinero en céntimos enteros, siempre (`shared/lib/money.ts`). Nunca negativos.
- Filosofía: **sugerir → confirmar → transferir** (§5.3). Nada se mueve sin confirmación explícita.
- Copy en español, sin emojis, tono Quipu (§3.8). Cadenas de UI en `modules/savings/constants.ts`.
- Tokens de diseño §3.3 (clases `text-ink`, `bg-card`, `border-line`, `text-qp-deep`, etc.). Sin hex en componentes.
- Estilo de código: sin comentarios salvo donde el archivo ya los usa; seguir convenciones de `convex/savings.ts` (ConvexError con `code`, `data`).
- Validación antes de cerrar cada tarea: `pnpm vitest run <archivo>` + al final `pnpm lint` y `pnpm build:next`.
- Skills activas durante ejecución: `caveman`, `ponytail`, `vercel-react-best-practices`, `next-best-practices`, `nodejs-best-practices`.

---

### Task 1: Motor de sugerencia puro (`savingsAssignPlan.ts`)

**Files:**
- Create: `convex/lib/savingsAssignPlan.ts`
- Test: `convex/lib/savingsAssignPlan.test.ts`

**Interfaces:**
- Produces: `buildSavingsAssignPlan(input)` y `validateSavingsAssignLines(lines, input)` (firmas abajo). Los Tasks 2 y 5 los consumen.

- [ ] **Step 1: Escribir tests fallidos**

```ts
// convex/lib/savingsAssignPlan.test.ts
import { describe, expect, it } from "vitest";
import {
  buildSavingsAssignPlan,
  validateSavingsAssignLines,
} from "./savingsAssignPlan";

const fund = {
  subEnvelopeId: "fund",
  label: "Fondo de emergencia",
  currentAmount: 50_000,
  targetAmount: 300_000,
};
const goalFar = {
  subEnvelopeId: "goal-a",
  label: "Casa",
  currentAmount: 0,
  targetAmount: 1_000_000,
};
const goalNear = {
  subEnvelopeId: "goal-b",
  label: "Viaje",
  currentAmount: 80_000,
  targetAmount: 100_000,
};
const goalOpen = {
  subEnvelopeId: "goal-c",
  label: "Libre",
  currentAmount: 0,
  targetAmount: 0,
};

describe("buildSavingsAssignPlan", () => {
  it("retorna null si no hay disponible", () => {
    expect(
      buildSavingsAssignPlan({
        availableCents: 0,
        emergencyFund: fund,
        goals: [goalNear],
      }),
    ).toBeNull();
    expect(
      buildSavingsAssignPlan({
        availableCents: -5,
        emergencyFund: fund,
        goals: [],
      }),
    ).toBeNull();
  });

  it("prioriza el Fondo incompleto y limita a lo que falta", () => {
    const plan = buildSavingsAssignPlan({
      availableCents: 400_000,
      emergencyFund: fund,
      goals: [goalNear],
    });
    expect(plan).not.toBeNull();
    expect(plan?.lines[0]).toMatchObject({
      subEnvelopeId: "fund",
      suggestedCents: 250_000,
    });
    expect(plan?.lines[1]).toMatchObject({
      subEnvelopeId: "goal-b",
      suggestedCents: 100_000,
    });
    expect(plan?.totalCents).toBe(350_000);
    expect(plan?.rationale).toBe("fund_first");
  });

  it("reparte en cascada a la meta más cercana cuando el Fondo está completo", () => {
    const plan = buildSavingsAssignPlan({
      availableCents: 60_000,
      emergencyFund: { ...fund, currentAmount: 300_000 },
      goals: [goalFar, goalNear],
    });
    expect(plan?.lines[0]).toMatchObject({
      subEnvelopeId: "goal-b",
      suggestedCents: 20_000,
    });
    expect(plan?.lines[1]).toMatchObject({
      subEnvelopeId: "goal-a",
      suggestedCents: 40_000,
    });
    expect(plan?.rationale).toBe("complete_nearest_goal");
  });

  it("el sobrante sin destino va a la meta abierta (sin targetAmount)", () => {
    const plan = buildSavingsAssignPlan({
      availableCents: 30_000,
      emergencyFund: { ...fund, currentAmount: 300_000 },
      goals: [goalOpen],
    });
    expect(plan?.lines).toHaveLength(1);
    expect(plan?.lines[0]).toMatchObject({
      subEnvelopeId: "goal-c",
      suggestedCents: 30_000,
    });
  });

  it("sin metas, todo va al Fondo aunque rebase su objetivo", () => {
    const plan = buildSavingsAssignPlan({
      availableCents: 15_000,
      emergencyFund: { ...fund, currentAmount: 300_000 },
      goals: [],
    });
    expect(plan?.lines).toHaveLength(1);
    expect(plan?.lines[0]).toMatchObject({
      subEnvelopeId: "fund",
      suggestedCents: 15_000,
    });
    expect(plan?.rationale).toBe("fund_reinforce");
  });

  it("ignora metas ya completas y nunca excede el disponible", () => {
    const plan = buildSavingsAssignPlan({
      availableCents: 500_000,
      emergencyFund: { ...fund, currentAmount: 300_000 },
      goals: [{ ...goalNear, currentAmount: 100_000 }],
    });
    expect(plan?.lines).toHaveLength(1);
    expect(plan?.lines[0].subEnvelopeId).toBe("fund");
    expect(plan?.totalCents).toBe(500_000);
  });
});

describe("validateSavingsAssignLines", () => {
  it("normaliza y acepta líneas válidas", () => {
    const result = validateSavingsAssignLines(
      [
        { subEnvelopeId: "fund", amount: 100 },
        { subEnvelopeId: "goal-b", amount: 50 },
      ],
      { availableCents: 150, ownedIds: ["fund", "goal-b"] },
    );
    expect(result).toEqual([
      { subEnvelopeId: "fund", amount: 100 },
      { subEnvelopeId: "goal-b", amount: 50 },
    ]);
  });

  it("rechaza montos no enteros, cero, negativos o vacíos", () => {
    expect(() =>
      validateSavingsAssignLines([], { availableCents: 100, ownedIds: ["fund"] }),
    ).toThrow();
    expect(() =>
      validateSavingsAssignLines([{ subEnvelopeId: "fund", amount: 1.5 }], {
        availableCents: 100,
        ownedIds: ["fund"],
      }),
    ).toThrow();
    expect(() =>
      validateSavingsAssignLines([{ subEnvelopeId: "fund", amount: 0 }], {
        availableCents: 100,
        ownedIds: ["fund"],
      }),
    ).toThrow();
  });

  it("rechaza destino ajeno o duplicado", () => {
    expect(() =>
      validateSavingsAssignLines([{ subEnvelopeId: "other", amount: 10 }], {
        availableCents: 100,
        ownedIds: ["fund"],
      }),
    ).toThrow();
    expect(() =>
      validateSavingsAssignLines(
        [
          { subEnvelopeId: "fund", amount: 10 },
          { subEnvelopeId: "fund", amount: 20 },
        ],
        { availableCents: 100, ownedIds: ["fund"] },
      ),
    ).toThrow();
  });

  it("rechaza total mayor al disponible", () => {
    expect(() =>
      validateSavingsAssignLines([{ subEnvelopeId: "fund", amount: 200 }], {
        availableCents: 100,
        ownedIds: ["fund"],
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm vitest run convex/lib/savingsAssignPlan.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar la lib**

```ts
// convex/lib/savingsAssignPlan.ts
export const SAVINGS_ASSIGN_RATIONALES = [
  "fund_first",
  "complete_nearest_goal",
  "fund_reinforce",
] as const;

export type SavingsAssignRationale =
  (typeof SAVINGS_ASSIGN_RATIONALES)[number];

export type SavingsAssignTargetSlice = {
  subEnvelopeId: string;
  label: string;
  currentAmount: number;
  /** 0 = meta abierta (sin objetivo). */
  targetAmount: number;
};

export type SavingsAssignPlanLine = {
  subEnvelopeId: string;
  label: string;
  suggestedCents: number;
  remainingToTargetCents: number;
};

export type SavingsAssignPlan = {
  lines: SavingsAssignPlanLine[];
  totalCents: number;
  rationale: SavingsAssignRationale;
};

function buildLine(
  target: SavingsAssignTargetSlice,
  cents: number,
): SavingsAssignPlanLine {
  return {
    subEnvelopeId: target.subEnvelopeId,
    label: target.label,
    suggestedCents: cents,
    remainingToTargetCents: Math.max(
      0,
      target.targetAmount - target.currentAmount,
    ),
  };
}

export function buildSavingsAssignPlan(input: {
  availableCents: number;
  emergencyFund: SavingsAssignTargetSlice;
  goals: ReadonlyArray<SavingsAssignTargetSlice>;
}): SavingsAssignPlan | null {
  const available = Math.max(0, Math.floor(input.availableCents));
  if (available <= 0) return null;

  const lines: SavingsAssignPlanLine[] = [];
  let remaining = available;
  const push = (target: SavingsAssignTargetSlice, cents: number) => {
    if (cents <= 0) return;
    lines.push(buildLine(target, cents));
    remaining -= cents;
  };

  const fund = input.emergencyFund;
  const fundRemainingToTarget = Math.max(
    0,
    fund.targetAmount - fund.currentAmount,
  );

  if (fundRemainingToTarget > 0) {
    push(fund, Math.min(remaining, fundRemainingToTarget));
    if (remaining === 0) {
      return { lines, totalCents: available, rationale: "fund_first" };
    }
  }

  const incompleteGoals = input.goals
    .filter((goal) => goal.targetAmount > goal.currentAmount)
    .sort(
      (a, b) =>
        a.targetAmount - a.currentAmount - (b.targetAmount - b.currentAmount),
    );
  for (const goal of incompleteGoals) {
    if (remaining === 0) break;
    push(goal, Math.min(remaining, goal.targetAmount - goal.currentAmount));
  }

  if (remaining > 0) {
    const openGoal = input.goals.find((goal) => goal.targetAmount === 0);
    if (openGoal) {
      push(openGoal, remaining);
    } else {
      push(fund, remaining);
    }
  }

  if (lines.length === 0) return null;

  const rationale: SavingsAssignRationale =
    fundRemainingToTarget > 0
      ? "fund_first"
      : incompleteGoals.length > 0
        ? "complete_nearest_goal"
        : "fund_reinforce";
  return { lines, totalCents: available, rationale };
}

export function validateSavingsAssignLines(
  lines: ReadonlyArray<{ subEnvelopeId: string; amount: number }>,
  input: { availableCents: number; ownedIds: ReadonlySet<string> | string[] },
): Array<{ subEnvelopeId: string; amount: number }> {
  const ownedIds = new Set(input.ownedIds);
  const seen = new Set<string>();
  let total = 0;
  const normalized = lines.map((line) => {
    if (!Number.isInteger(line.amount) || line.amount <= 0) {
      throw new Error("Cada monto debe ser un entero de céntimos mayor a cero.");
    }
    if (!ownedIds.has(line.subEnvelopeId)) {
      throw new Error("Destino de ahorro no válido.");
    }
    if (seen.has(line.subEnvelopeId)) {
      throw new Error("Cada destino solo puede aparecer una vez.");
    }
    seen.add(line.subEnvelopeId);
    total += line.amount;
    return { subEnvelopeId: line.subEnvelopeId, amount: line.amount };
  });
  if (normalized.length === 0) {
    throw new Error("Agrega al menos un destino para tu ahorro.");
  }
  if (total > input.availableCents) {
    throw new Error("El reparto supera el saldo disponible del sobre de ahorro.");
  }
  return normalized;
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `pnpm vitest run convex/lib/savingsAssignPlan.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add convex/lib/savingsAssignPlan.ts convex/lib/savingsAssignPlan.test.ts
git commit -m "feat(savings): motor puro de asignación de ahorro"
```

---

### Task 2: Exponer el plan en `getSavingsOverview`

**Files:**
- Modify: `convex/savings.ts` (función `buildSavingsOverview`, ~L89-203; y el `export const getOverview` si define `returns` validator — añadir el campo ahí también)

**Interfaces:**
- Consumes: `buildSavingsAssignPlan` (Task 1).
- Produces: `getOverview` retorna campo extra `assignPlan: SavingsAssignPlan | null` con `{ lines: [{subEnvelopeId, label, suggestedCents, remainingToTargetCents}], totalCents, rationale }`. El front lo consume vía `SavingsOverview["assignPlan"]` (Task 5/6).

- [ ] **Step 1: Añadir el import**

```ts
import { buildSavingsAssignPlan } from "./lib/savingsAssignPlan";
```

- [ ] **Step 2: Calcular el plan dentro de `buildSavingsOverview`**

Justo después de `const emergencyFundPayload = buildEmergencyFundPayload({...})` (donde `emergencyFund` y `goals` ya están en scope), añadir:

```ts
const assignPlan = buildSavingsAssignPlan({
  availableCents: savingsEnvelopeRemaining,
  emergencyFund: {
    subEnvelopeId: emergencyFund._id,
    label: emergencyFund.label,
    currentAmount: emergencyFund.currentAmount,
    targetAmount: emergencyFundPayload.targetAmount,
  },
  goals: subEnvelopes
    .filter((subEnvelope) => !subEnvelope.isSystemDefault)
    .map((subEnvelope) => ({
      subEnvelopeId: subEnvelope._id,
      label: subEnvelope.label,
      currentAmount: subEnvelope.currentAmount,
      targetAmount: subEnvelope.targetAmount ?? 0,
    })),
});
```

En el retorno del payload (rama con `emergencyFund`), añadir `assignPlan`. También añadir `assignPlan: null` en el retorno temprano sin `emergencyFund` (L156-167).

Si `getOverview` tiene `returns: v.object({...})`, añadir el validador:

```ts
assignPlan: v.union(
  v.null(),
  v.object({
    lines: v.array(
      v.object({
        subEnvelopeId: v.id("subEnvelopes"),
        label: v.string(),
        suggestedCents: v.number(),
        remainingToTargetCents: v.number(),
      }),
    ),
    totalCents: v.number(),
    rationale: v.union(
      v.literal("fund_first"),
      v.literal("complete_nearest_goal"),
      v.literal("fund_reinforce"),
    ),
  }),
),
```

- [ ] **Step 3: Typecheck**

Run: `pnpm build:next` (o `npx convex dev --typecheck disable` solo si falta env; el objetivo es que el código compile)
Expected: sin errores de tipos en `convex/savings.ts`.

- [ ] **Step 4: Commit**

```bash
git add convex/savings.ts
git commit -m "feat(savings): exponer plan de asignación en getOverview"
```

---

### Task 3: Mutación `assignSavingsEnvelope` + DRY del contexto

**Files:**
- Modify: `convex/savings.ts` (`getOwnedProfileAndActiveCycle` L587, `executeContribution` L205, nuevo export al final del archivo)

**Interfaces:**
- Consumes: `validateSavingsAssignLines` (Task 1), `getOwnedProfileAndActiveCycle`.
- Produces: `assignSavingsEnvelope({ lines })` → `{ assignedCents, savingsRemainingCents, results: [{subEnvelopeId, label, amount, newCurrentAmount}] }`.

- [ ] **Step 1: Unificar mensajes de ciclo inactivo**

Cambiar la firma de `getOwnedProfileAndActiveCycle` para aceptar mensaje opcional y reutilizarla desde `executeContribution`:

```ts
async function getOwnedProfileAndActiveCycle(
  ctx: QueryCtx | MutationCtx,
  noCycleMessage = "Registra un ingreso para activar tu ciclo antes de mover sobrante.",
) {
  // ... igual que ahora, pero:
  // throw new ConvexError({ code: "NO_ACTIVE_CYCLE", message: noCycleMessage });
}
```

En `executeContribution`, reemplazar el bloque manual de identity/profile/activeCycle (L210-248) por:

```ts
const { profile, activeCycle } = await getOwnedProfileAndActiveCycle(
  ctx,
  "Registra un ingreso para activar tu ciclo antes de aportar.",
);
```

(y quitar la declaración local duplicada de profile/activeCycle; el resto del helper queda igual).

- [ ] **Step 2: Crear la mutación**

```ts
export const assignSavingsEnvelope = mutation({
  args: {
    lines: v.array(
      v.object({
        subEnvelopeId: v.id("subEnvelopes"),
        amount: v.number(),
      }),
    ),
  },
  returns: v.object({
    assignedCents: v.number(),
    savingsRemainingCents: v.number(),
    results: v.array(
      v.object({
        subEnvelopeId: v.id("subEnvelopes"),
        label: v.string(),
        amount: v.number(),
        newCurrentAmount: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const { profile, activeCycle } = await getOwnedProfileAndActiveCycle(ctx);

    const savingsEnvelope = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) =>
        q.eq("cycleId", activeCycle._id).eq("type", "savings"),
      )
      .unique();
    if (!savingsEnvelope) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Sobre de ahorro no encontrado en el ciclo actual.",
      });
    }
    const available = Math.max(0, savingsEnvelope.remainingAmount);

    const subEnvelopes = await ctx.db
      .query("subEnvelopes")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    const ownedIds = subEnvelopes.map(
      (subEnvelope) => subEnvelope._id as string,
    );

    const validLines = validateSavingsAssignLines(
      args.lines.map((line) => ({
        subEnvelopeId: line.subEnvelopeId as string,
        amount: line.amount,
      })),
      { availableCents: available, ownedIds },
    );

    const total = validLines.reduce((sum, line) => sum + line.amount, 0);
    await ctx.db.patch(savingsEnvelope._id, {
      remainingAmount: savingsEnvelope.remainingAmount - total,
    });

    const results = [] as Array<{
      subEnvelopeId: Id<"subEnvelopes">;
      label: string;
      amount: number;
      newCurrentAmount: number;
    }>;
    for (const line of validLines) {
      const subEnvelope = await ctx.db.get(
        line.subEnvelopeId as Id<"subEnvelopes">,
      );
      if (!subEnvelope) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Meta de ahorro no encontrada.",
        });
      }
      await ctx.db.patch(subEnvelope._id, {
        currentAmount: subEnvelope.currentAmount + line.amount,
      });
      results.push({
        subEnvelopeId: subEnvelope._id,
        label: subEnvelope.label,
        amount: line.amount,
        newCurrentAmount: subEnvelope.currentAmount + line.amount,
      });
    }

    return {
      assignedCents: total,
      savingsRemainingCents: savingsEnvelope.remainingAmount - total,
      results,
    };
  },
});
```

- [ ] **Step 3: Verificar (typecheck + suite de invariantes)**

Run: `pnpm vitest run convex/lib/financialInvariants.test.ts`
Expected: PASS (sin cambios de comportamiento en invariantes).

- [ ] **Step 4: Commit**

```bash
git add convex/savings.ts
git commit -m "feat(savings): mutación atómica assignSavingsEnvelope"
```

---

### Task 4: Eliminar `contributeToGoal` (duplicado) y migrar call sites

**Files:**
- Modify: `convex/savings.ts` (borrar export `contributeToGoal` L568-575)
- Modify: `modules/savings/actions.ts` (`useContributeToGoal`, `parseContributeToGoalInput`, `contributeToGoal` → renombrar a variantes `SubEnvelope`)
- Modify: `modules/savings/components/contribute-goal-dialog.tsx` (usar la action renombrada)
- Verify: grep `contributeToGoal` en todo el repo tras el cambio

**Interfaces:**
- Produces: `api.savings.contributeToSubEnvelope` como única mutación de aporte; front `useContributeToSubEnvelope()`, `parseContributeToSubEnvelopeInput()`, `contributeToSubEnvelope(mutate, raw)` (mismas firmas que las actuales, solo cambia el nombre).

- [ ] **Step 1: Renombrar en `modules/savings/actions.ts`**

```ts
export function useContributeToSubEnvelope() {
  return useMutation(api.savings.contributeToSubEnvelope);
}

type ContributeToSubEnvelopeMutationArgs = FunctionArgs<
  typeof api.savings.contributeToSubEnvelope
>;

export function parseContributeToSubEnvelopeInput(
  raw: ContributeToGoalInput,
): ContributeToSubEnvelopeMutationArgs {
  const parsed = contributeToGoalInputSchema.parse(raw);
  return {
    subEnvelopeId: parsed.goalId as Id<"subEnvelopes">,
    ...(parsed.amountCents !== undefined ? { amount: parsed.amountCents } : {}),
  };
}

export async function contributeToSubEnvelope(
  mutate: ReturnType<typeof useContributeToSubEnvelope>,
  raw: ContributeToGoalInput,
) {
  return mutate(parseContributeToSubEnvelopeInput(raw));
}
```

Nota: el arg del servidor `contributeToSubEnvelope` es `subEnvelopeId` (no `goalId`), por eso cambia la key en el return. Renombrar también `contributeToGoalInputSchema` → `contributeToSubEnvelopeInputSchema` y `ContributeToGoalInput` → `ContributeToSubEnvelopeInput` en `modules/savings/schemas.ts`, actualizando imports en `actions.ts` y `contribute-goal-dialog.tsx`.

- [ ] **Step 2: Actualizar `contribute-goal-dialog.tsx`**

Reemplazar `useContributeToGoal()` → `useContributeToSubEnvelope()`, `contributeToGoal(contributeMutation, args)` → `contributeToSubEnvelope(contributeMutation, args)` (mismos args de form; `contributeToGoalFormToMutationArgs` en schemas.ts se renombra a `contributeToSubEnvelopeFormToMutationArgs` y su retorno pasa a `{ subEnvelopeId, amountCents }`).

- [ ] **Step 3: Borrar la mutación duplicada en el servidor**

Eliminar el bloque `export const contributeToGoal = mutation({...})` (L568-575) en `convex/savings.ts`.

- [ ] **Step 4: Verificar grep limpio + typecheck + lint**

Run: `Get-ChildItem -Recurse -Include *.ts,*.tsx -Exclude node_modules | Select-String "contributeToGoal"` → solo debe quedar lo renombrado (o nada).
Run: `pnpm lint` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(savings): unificar contributeToGoal en contributeToSubEnvelope"
```

---

### Task 5: `AssignSavingsSheet` (UI del asistente)

**Files:**
- Create: `modules/savings/components/assign-savings-sheet.tsx`
- Modify: `modules/savings/schemas.ts` (schema de formulario de asignación)
- Modify: `modules/savings/actions.ts` (hook `useAssignSavingsEnvelope`)
- Modify: `modules/savings/constants.ts` (copy)

**Interfaces:**
- Consumes: `SavingsOverview["assignPlan"]` (Task 2), `api.savings.assignSavingsEnvelope` (Task 3), `SavingsFormShell`, `Input`, `formatCents`, `fromConvexError`.
- Produces: `<AssignSavingsSheet open onOpenChange availableCents plan currencyCode />`.

- [ ] **Step 1: Copy en `constants.ts`**

```ts
export const ASSIGN_SHEET_TITLE = "¿Qué hago con tu ahorro?";
export const ASSIGN_SHEET_AVAILABLE_PREFIX = "Disponible:";
export const ASSIGN_SHEET_TOTAL_LABEL = "Total a asignar";
export const ASSIGN_SHEET_CONFIRM_CTA = "Confirmar reparto";
export const ASSIGN_SHEET_DISMISS = "Prefiero decidirlo después";
export const ASSIGN_SHEET_SUCCESS_PREFIX = "Listo.";
export const ASSIGN_SHEET_LINE_HINT_PREFIX = "Faltan";
export const ASSIGN_SHEET_RATIONALE: Record<
  "fund_first" | "complete_nearest_goal" | "fund_reinforce",
  string
> = {
  fund_first: "Completamos tu Fondo de emergencia primero.",
  complete_nearest_goal: "Completamos primero la meta más cercana.",
  fund_reinforce: "Tus metas están al día: reforzamos tu Fondo.",
};
```

- [ ] **Step 2: Schema + action**

En `schemas.ts`:

```ts
export const assignSavingsInputSchema = z.object({
  lines: z
    .array(
      z.object({
        subEnvelopeId: z.string().min(1, "Destino no válido."),
        amountCents: z
          .number()
          .int("El monto debe ser un entero de céntimos.")
          .positive("El monto debe ser mayor a cero."),
      }),
    )
    .min(1, "Agrega al menos un destino."),
});
export type AssignSavingsInput = z.infer<typeof assignSavingsInputSchema>;
```

En `actions.ts`:

```ts
export function useAssignSavingsEnvelope() {
  return useMutation(api.savings.assignSavingsEnvelope);
}

export async function assignSavingsEnvelope(
  mutate: ReturnType<typeof useAssignSavingsEnvelope>,
  raw: AssignSavingsInput,
) {
  const parsed = assignSavingsInputSchema.parse(raw);
  return mutate({
    lines: parsed.lines.map((line) => ({
      subEnvelopeId: line.subEnvelopeId as Id<"subEnvelopes">,
      amount: line.amountCents,
    })),
  });
}
```

- [ ] **Step 3: Componente**

Estructura (reutilizar `SavingsFormShell` como hace `ContributeGoalDialog`; los inputs usan `Input` + `parseOptionalTargetCents` como el diálogo de aporte — no keypad dedicado, YAGNI):

```tsx
"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCents } from "@/shared/lib/money";
import { fromConvexError } from "@/core/errors";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { SavingsFormShell } from "./savings-form-shell";
import {
  assignSavingsEnvelope as assignSavingsEnvelopeAction,
  useAssignSavingsEnvelope,
} from "../actions";
import {
  ASSIGN_SHEET_AVAILABLE_PREFIX,
  ASSIGN_SHEET_CONFIRM_CTA,
  ASSIGN_SHEET_DISMISS,
  ASSIGN_SHEET_LINE_HINT_PREFIX,
  ASSIGN_SHEET_RATIONALE,
  ASSIGN_SHEET_SUCCESS_PREFIX,
  ASSIGN_SHEET_TITLE,
  ASSIGN_SHEET_TOTAL_LABEL,
} from "../constants";

type PlanLine = {
  subEnvelopeId: string;
  label: string;
  suggestedCents: number;
  remainingToTargetCents: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCents: number;
  currencyCode: string;
  plan: {
    lines: PlanLine[];
    totalCents: number;
    rationale: "fund_first" | "complete_nearest_goal" | "fund_reinforce";
  } | null;
};

export function AssignSavingsSheet({
  open,
  onOpenChange,
  availableCents,
  currencyCode,
  plan,
}: Props) {
  const assign = useAssignSavingsEnvelope();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lines = useMemo(() => plan?.lines ?? [], [plan]);

  const parsedLines = lines.map((line) => {
    const raw = amounts[line.subEnvelopeId];
    const amountCents = raw === undefined
      ? line.suggestedCents
      : (parseOptionalTargetCents(raw) ?? 0);
    return { ...line, amountCents };
  });
  const totalCents = parsedLines.reduce(
    (sum, line) => sum + Math.max(0, line.amountCents),
    0,
  );
  const hasInvalidLine = parsedLines.some((line) => line.amountCents < 0);
  const canSubmit =
    !hasInvalidLine && totalCents > 0 && totalCents <= availableCents;

  // dentro del render: header con título + rationale, lista de filas
  // (Input con valor inicial = suggestedCents formateado), fila total,
  // botón Confirmar y link "Prefiero decidirlo después".
  // onSubmit: build lines desde parsedLines (filtrar amountCents > 0),
  // llamar assignSavingsEnvelopeAction, toast.success con
  // ASSIGN_SHEET_SUCCESS_PREFIX + desglose de results, onOpenChange(false).
  // catch: toast.error(fromConvexError(error).message).
}
```

Completar el JSX siguiendo el patrón de `contribute-goal-dialog.tsx` (Field/Input/FieldError, `Button` disabled cuando `isSubmitting || !canSubmit`, hint por línea `Faltan {formatCents(remainingToTargetCents)}` cuando `> 0`).

- [ ] **Step 4: Verificar visual + lint**

Run: `pnpm lint`
Expected: PASS. Smoke manual: abrir `/savings`, abrir sheet, ver líneas prellenadas, editar una, confirmar.

- [ ] **Step 5: Commit**

```bash
git add modules/savings
git commit -m "feat(savings): sheet de asignación de ahorro con reparto sugerido"
```

---

### Task 6: Card CTA en `/savings` + skeleton

**Files:**
- Modify: `modules/savings/components/savings-view.tsx` (estado `assignOpen`, card CTA bajo el header cuando `overview.assignPlan !== null`, render del sheet)
- Modify: `modules/savings/components/cycle-savings-section.tsx` — NO: la card vive en `savings-view.tsx` junto al hero; añadir `AssignSavingsCard` inline en `assign-savings-sheet.tsx` o como componente hermano `assign-savings-card.tsx` (Create)

**Interfaces:**
- Consumes: `overview.assignPlan`, `overview.emergencyFund.availableToContributeCents` (saldo del sobre de ahorro), `AssignSavingsSheet` (Task 5).
- Produces: card "Tienes X sin asignar" con CTA "Decidir destino".

- [ ] **Step 1: Componente `assign-savings-card.tsx`**

```tsx
"use client";

import { Button } from "@/shared/components/ui/button";
import { formatCents } from "@/shared/lib/money";

export const ASSIGN_CARD_TITLE = "Tu ahorro del ciclo está sin destino";
export const ASSIGN_CARD_CTA = "Decidir destino";

export function AssignSavingsCard({
  availableCents,
  currencyCode,
  onOpen,
}: {
  availableCents: number;
  currencyCode: string;
  onOpen: () => void;
}) {
  return (
    <section className="rounded-xl border border-qp-shield-line bg-qp-selected p-4 md:p-5">
      <p className="text-[13.5px] font-medium text-qp-deep">
        {ASSIGN_CARD_TITLE}
      </p>
      <p className="mt-1 text-[12.5px] text-mute-subtle">
        Tienes {formatCents(availableCents, { currency: currencyCode })} sin
        asignar en tu ahorro del ciclo.
      </p>
      <Button type="button" className="mt-3" onClick={onOpen}>
        {ASSIGN_CARD_CTA}
      </Button>
    </section>
  );
}
```

- [ ] **Step 2: Wire en `savings-view.tsx`**

```tsx
const [assignOpen, setAssignOpen] = useState(false);
const assignAvailableCents = overview.assignPlan?.totalCents ?? 0;
```

Después de `EmergencyFundHero`:

```tsx
{overview.assignPlan ? (
  <AssignSavingsCard
    availableCents={assignAvailableCents}
    currencyCode={overview.profile.currencyCode}
    onOpen={() => setAssignOpen(true)}
  />
) : null}
```

Y al final del árbol:

```tsx
<AssignSavingsSheet
  open={assignOpen}
  onOpenChange={setAssignOpen}
  availableCents={assignAvailableCents}
  currencyCode={overview.profile.currencyCode}
  plan={overview.assignPlan}
/>
```

- [ ] **Step 3: Skeleton**

En `SavingsViewSkeleton` añadir, tras el skeleton del hero, un bloque `<Skeleton className="h-28 w-full rounded-xl" />` condicionado a nada (siempre en skeleton; barato y correcto).

- [ ] **Step 4: Smoke manual**

Run: dev + `/savings` con ciclo activo y saldo sin asignar.
Expected: card visible → abrir sheet → confirmar → toast de éxito → card desaparece (query se refresca sola).

- [ ] **Step 5: Commit**

```bash
git add modules/savings
git commit -m "feat(savings): CTA de asignación en la vista de ahorros"
```

---

### Task 7: Nudge del coach

**Files:**
- Modify: `convex/dashboard.ts` (donde se construye la presentación del coach con `resolveCoachPresentation`, payload de `getSummary`)
- Modify: `modules/dashboard/` (render de la fila/nudge con CTA a `/savings`)
- Modify: `modules/coach/` solo si el copy vive allí

**Interfaces:**
- Consumes: `savingsEnvelopeRemainingCents` (ya calculado en dashboard o derivable del ciclo activo).
- Produces: nudge `savings_unassigned` con CTA interno a `/savings` (no ruta nueva).

- [ ] **Step 1: Señal en el payload**

En `getSummary` (convex/dashboard.ts), donde ya se resuelve el sobre de ahorro del ciclo, añadir al payload del coach:

```ts
savingsUnassignedCents: Math.max(0, savingsEnvelope?.remainingAmount ?? 0),
```

- [ ] **Step 2: Nudge en el front**

En el componente de coach card (`modules/dashboard/components/` o `modules/coach/`), después de los estados warning/crisis existentes, añadir fila tranquila (solo si no hay estado de crisis activo y `savingsUnassignedCents > 0`):

```tsx
<p className="text-[13px] text-ink-secondary">
  Tienes {formatCents(savingsUnassignedCents, { currency: currencyCode })} en
  tu sobre de ahorro sin destino.
</p>
<Link
  href="/savings"
  className="text-[12.5px] font-medium text-qp-deep"
>
  Decidir destino
</Link>
```

Seguir el patrón de las filas existentes del coach card (misma fila/clases). Suggest-only: sin badge de crisis ni ámbar.

- [ ] **Step 3: Lint + typecheck**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add convex/dashboard.ts modules/dashboard modules/coach
git commit -m "feat(coach): nudge de ahorro del ciclo sin destino"
```

---

### Task 8: Verificación final y actualización del maestro

**Files:**
- Modify: `docs/QUIPU-MASTER.md` (§8.2, fila Bloque 6 — añadir asistente de asignación; §8.3 si procede)

- [ ] **Step 1: Suite completa**

Run: `pnpm vitest run` → PASS (incluye `savingsAssignPlan.test.ts` y `financialInvariants.test.ts`).

- [ ] **Step 2: Lint + build**

Run: `pnpm lint && pnpm build:next` → PASS.

- [ ] **Step 3: Smoke E2E manual**

Casos:
1. Ciclo con saldo de ahorro sin asignar → card + nudge visibles.
2. Sugerencia correcta (fondo incompleto → Fondo).
3. Editar línea a 0 → fila se excluye del total.
4. Total > disponible → botón deshabilitado.
5. Confirmar → success con deltas → sobre y metas actualizados → card y nudge desaparecen.

- [ ] **Step 4: Actualizar QUIPU-MASTER §8.2**

En la entrada de Bloque 6 - Ahorros, añadir: "asistente de asignación (`assignSavingsEnvelope` + sheet en `/savings`): reparto sugerido editable hacia Fondo/metas; `contributeToGoal` unificado en `contributeToSubEnvelope`".

- [ ] **Step 5: Commit**

```bash
git add docs/QUIPU-MASTER.md
git commit -m "docs: registrar asistente de asignación de ahorro en el maestro"
```
