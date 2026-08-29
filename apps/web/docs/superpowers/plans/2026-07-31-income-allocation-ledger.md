# Income Allocation Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quipu must answer “¿Cuánto puedo gastar hoy sin arruinar mi mes?” by separating money entered, money reserved for commitments, money assigned to spendable envelopes, planned cycle savings, confirmed savings contributions, and unallocated balance — without treating unspent cash as automatic additional savings.

**Architecture:** Extend Convex with an allocation ledger (`incomeAllocationLines`, `commitmentReservations`, `internalTransfers`) and `financialCycles.unallocatedCents`. Income registration accepts an explicit distribution plan (reservations + envelopes + savings contributions + unallocated). Savings breakdown and spendable balance are derived only from persisted facts in Convex; frontend formats and confirms, never re-derives critical money rules. Correcting a misconfigured cycle creates auditable internal transfers instead of fake income/expense.

**Tech Stack:** Convex (schema + queries/mutations + pure libs + Vitest), Next.js App Router modules (`modules/income`, `modules/savings`, `modules/commitments`, `modules/dashboard`), TanStack Form + Zod, integer cents via `shared/lib/money.ts`.

## Global Constraints

- Money is always **integer cents**; never float arithmetic for balances.
- Work only against **Convex development** (`CONVEX_AGENT_MODE=anonymous` / local anonymous). Never production.
- Platform is **Next.js mobile-first web** (not a separate React Native app); implement in this repo’s UI stack.
- Do not invent silent historical contributions; uncertain legacy money → `unallocatedCents` + `needsReview: true`.
- Internal transfers are not income and not expense.
- Additional savings appear only after explicit confirmation (`surplusContributions` / contribution lines with `kind: "additional"`).
- Preserve movement history; corrections append ledger rows.
- Centralize financial rules in `convex/lib/*`; frontend may preview using the same shared pure helpers under `shared/lib/` only when they mirror Convex (no divergent formulas).
- Keep UX everyday language: “Puedes gastar”, “Reservado”, “Ahorrado de verdad”, “Por repartir”.

## Audit findings (root cause map)

| Symptom shown | Where computed | Persistido vs derivado | Defecto |
|---|---|---|---|
| Sobre Ahorro ~S/ 990.80 | `envelopes.allocatedAmount` type `savings`; Home shows allocated (`envelope-cards.tsx`) | Persistido (sum of `distributionApplied.savings` patches) | Trata el 20% del ingreso bruto (o neto de `heldCents`) como “ahorro”, aunque no se haya aportado al Fondo |
| Ahorro adicional ~S/ 685.67 | `computeCycleSavingsBreakdown` → `sumAdditionalSavingsFromEvents` + `surplusContributions` | Mixto: `all_to_savings` en `distributionApplied` + filas `surplusContributions` | Dinero no gastado / segunda quincena / policy `all_to_savings` se etiqueta como “adicional” sin aporte confirmado al Fondo |
| Ahorro del ciclo S/ 1,676.47 | `savingsObjectiveCents + savingsAdditionalCents` | Derivado | Suma proyecciones de sobre + “adicional” inferido; **no** es Σ aportes reales a `subEnvelopes` |
| Copy “ya está en tu Fondo…” | `CYCLE_SAVINGS_PARKED_COPY` when `remainingAmount <= 0` | UI | Solo verdadero si se movió todo el sobre; el total grande sigue midiendo asignación, no aportes |
| Necesidades infladas | `createIncomeEvent` auto 50/30/20 sobre `amount - heldCents` | Persistido en envelopes | Usuario registró “cuánto tenía”, no “cuánto puede usar”; deuda no reservada queda dentro de sobres gastables |
| `heldCents` | `incomeEvents.heldCents` + cascada cobertura | Persistido, pero **no** es reserva por compromiso | No consume dinero al pagar; no libera a unallocated; no aparece como “reservado” en Home |
| Segunda quincena | `createIncomeEvent` patch `allocatedAmount += distribution` | Persistido | Recalcula sobres sumando otro 50/30/20; remanente se ofrece como sobrante → ahorro |
| Disponible hoy | `computeDailyAvailable(wants.remaining, daysRemaining)` | Derivado en `dashboard.ts` | Ignora reservas reales; needs remanente de deuda cuenta como gastable |

**Causa raíz:** el modelo trata “ingreso registrado → auto-reparto a sobres” como verdad de disponibilidad, e “asignado al sobre Ahorro / no gastado” como ahorro. Faltan hechos de **asignación explícita**, **reserva de compromiso** y **aporte confirmado**.

## File structure (create / modify)

| File | Responsibility |
|---|---|
| `convex/schema.ts` | Add `unallocatedCents`, `needsReview`; tables `commitmentReservations`, `incomeAllocationLines`, `internalTransfers`; optional `savingsContributionKind` on surplus rows |
| `convex/lib/moneyInvariant.ts` | Cent validation, allocation sum checks, double-count guards |
| `convex/lib/incomeAllocation.ts` | Pure: validate + apply allocation plan → envelope deltas, reservations, unallocated, contributions |
| `convex/lib/commitmentReservation.ts` | Pure: reservation status, pay-from-reserve, release |
| `convex/lib/spendableBalance.ts` | Pure: spendable / reserved / unallocated / daily available |
| `convex/lib/cycleSavingsBreakdown.ts` | Rewrite: objective target vs contributed; additional only confirmed |
| `convex/lib/cycleCorrection.ts` | Pure: build internal transfers for cycle redistribution |
| `convex/incomeEvents.ts` | Accept `allocation` plan; write ledger lines; stop auto-saving unspent |
| `convex/fixedCommitments.ts` | Reserve / pay-with-reserve / cancel-release mutations |
| `convex/cycleCorrection.ts` (new) | `correctActiveCycleAllocation` mutation |
| `convex/savings.ts` | Serve new breakdown fields; keep parked copy truthful |
| `convex/dashboard.ts` | Expose reserved, unallocated, spendable; savings card progress vs contributed |
| `convex/migrations/markLegacyAllocationsForReview.ts` | Dev migration: do not invent contributions |
| `shared/lib/incomeAllocation.ts` | Shared validators/types for form + Convex |
| `modules/income/...` | Distribution step UI after amount |
| `modules/commitments/...` | Reservation + pay-from-reserve UX |
| `modules/savings/...` | Labels/metrics for real contributions |
| `modules/dashboard/...` | Spendable / reserved / por repartir |
| `modules/cycle-correction/...` (new) | Correct-cycle flow |
| `docs/QUIPU-MASTER.md` | Domain rules §5 + changelog |

---

### Task 1: Money invariants + allocation plan pure module

**Files:**
- Create: `convex/lib/moneyInvariant.ts`
- Create: `convex/lib/moneyInvariant.test.ts`
- Create: `convex/lib/incomeAllocation.ts`
- Create: `convex/lib/incomeAllocation.test.ts`
- Create: `shared/lib/incomeAllocation.ts` (types + validateAllocationPlan shared)

**Interfaces:**
- Produces: `validateAllocationPlan(amountCents, plan) → { ok, error? }`, `AllocationPlan`, `AllocationApplyResult`
- Consumes: integer cents only

- [ ] **Step 1: Write failing tests for allocation sum and non-negative cents**

```typescript
// convex/lib/moneyInvariant.test.ts
import { describe, expect, it } from "vitest";
import {
  assertNonNegativeCents,
  assertAllocationBalances,
} from "./moneyInvariant";

describe("moneyInvariant", () => {
  it("rejects non-integer cents", () => {
    expect(() => assertNonNegativeCents(10.5, "amount")).toThrow(/céntimos/);
  });

  it("rejects negative cents", () => {
    expect(() => assertNonNegativeCents(-1, "amount")).toThrow(/negativo/);
  });

  it("passes balanced allocation (no double count)", () => {
    expect(
      assertAllocationBalances(100_00, {
        reservedCents: 40_00,
        envelopesCents: 30_00,
        savingsContributionCents: 20_00,
        unallocatedCents: 10_00,
      }),
    ).toEqual({ ok: true });
  });

  it("fails when destinations exceed income", () => {
    expect(
      assertAllocationBalances(100_00, {
        reservedCents: 60_00,
        envelopesCents: 50_00,
        savingsContributionCents: 0,
        unallocatedCents: 0,
      }).ok,
    ).toBe(false);
  });

  it("fails when destinations under-assign without unallocated", () => {
    expect(
      assertAllocationBalances(100_00, {
        reservedCents: 40_00,
        envelopesCents: 30_00,
        savingsContributionCents: 0,
        unallocatedCents: 0,
      }).ok,
    ).toBe(false);
  });
});
```

```typescript
// convex/lib/incomeAllocation.test.ts
import { describe, expect, it } from "vitest";
import { buildAllocationApplyResult } from "./incomeAllocation";

describe("buildAllocationApplyResult", () => {
  it("fully distributes income without inventing additional savings", () => {
    const result = buildAllocationApplyResult({
      amountCents: 318_237,
      plan: {
        reservations: [{ commitmentId: "c1", amountCents: 250_000 }],
        envelopes: { needs: 40_000, wants: 10_000, savings: 8_000 },
        savingsContributions: [
          { amountCents: 5_000, kind: "objective" },
        ],
        leaveUnallocatedCents: 5_237,
      },
    });
    expect(result.totals.reservedCents).toBe(250_000);
    expect(result.totals.additionalContributionCents).toBe(0);
    expect(result.totals.unallocatedCents).toBe(5_237);
    expect(result.distributionApplied).toEqual({
      needs: 40_000,
      wants: 10_000,
      savings: 8_000,
    });
  });

  it("counts only kind=additional as additional savings", () => {
    const result = buildAllocationApplyResult({
      amountCents: 20_000,
      plan: {
        reservations: [],
        envelopes: { needs: 0, wants: 0, savings: 0 },
        savingsContributions: [
          { amountCents: 12_000, kind: "objective" },
          { amountCents: 8_000, kind: "additional" },
        ],
        leaveUnallocatedCents: 0,
      },
    });
    expect(result.totals.objectiveContributionCents).toBe(12_000);
    expect(result.totals.additionalContributionCents).toBe(8_000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run convex/lib/moneyInvariant.test.ts convex/lib/incomeAllocation.test.ts`
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement pure modules**

```typescript
// convex/lib/moneyInvariant.ts
export function assertNonNegativeCents(value: number, field: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${field} debe ser céntimos enteros.`);
  }
  if (value < 0) {
    throw new Error(`${field} no puede ser negativo.`);
  }
}

export type AllocationBuckets = {
  reservedCents: number;
  envelopesCents: number;
  savingsContributionCents: number;
  unallocatedCents: number;
};

export function assertAllocationBalances(
  amountCents: number,
  buckets: AllocationBuckets,
): { ok: true } | { ok: false; message: string } {
  assertNonNegativeCents(amountCents, "amountCents");
  for (const [key, value] of Object.entries(buckets)) {
    assertNonNegativeCents(value, key);
  }
  const sum =
    buckets.reservedCents +
    buckets.envelopesCents +
    buckets.savingsContributionCents +
    buckets.unallocatedCents;
  if (sum !== amountCents) {
    return {
      ok: false,
      message: `La distribución (${sum}) debe sumar exactamente el ingreso (${amountCents}).`,
    };
  }
  return { ok: true };
}
```

```typescript
// convex/lib/incomeAllocation.ts
import { assertAllocationBalances } from "./moneyInvariant";

export type SavingsContributionKind = "objective" | "additional";

export type AllocationPlan = {
  reservations: Array<{ commitmentId: string; amountCents: number }>;
  envelopes: { needs: number; wants: number; savings: number };
  savingsContributions: Array<{
    amountCents: number;
    kind: SavingsContributionKind;
    subEnvelopeId?: string;
  }>;
  leaveUnallocatedCents: number;
};

export function buildAllocationApplyResult(input: {
  amountCents: number;
  plan: AllocationPlan;
}) {
  const reservedCents = input.plan.reservations.reduce(
    (s, r) => s + r.amountCents,
    0,
  );
  const envelopesCents =
    input.plan.envelopes.needs +
    input.plan.envelopes.wants +
    input.plan.envelopes.savings;
  const savingsContributionCents = input.plan.savingsContributions.reduce(
    (s, c) => s + c.amountCents,
    0,
  );
  const balance = assertAllocationBalances(input.amountCents, {
    reservedCents,
    envelopesCents,
    savingsContributionCents,
    unallocatedCents: input.plan.leaveUnallocatedCents,
  });
  if (!balance.ok) throw new Error(balance.message);

  return {
    distributionApplied: { ...input.plan.envelopes },
    heldFromReservationsCents: reservedCents,
    totals: {
      reservedCents,
      envelopesCents,
      objectiveContributionCents: input.plan.savingsContributions
        .filter((c) => c.kind === "objective")
        .reduce((s, c) => s + c.amountCents, 0),
      additionalContributionCents: input.plan.savingsContributions
        .filter((c) => c.kind === "additional")
        .reduce((s, c) => s + c.amountCents, 0),
      unallocatedCents: input.plan.leaveUnallocatedCents,
    },
  };
}
```

Mirror types in `shared/lib/incomeAllocation.ts` for the form (export the same shapes; keep validation functions duplicated or import from shared only if Convex can import `../shared/lib/...` — this repo already imports `../shared/lib/allocations` from Convex, so put shared validate there and re-export from convex lib).

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm exec vitest run convex/lib/moneyInvariant.test.ts convex/lib/incomeAllocation.test.ts`

- [ ] **Step 5: Commit**

```bash
git add convex/lib/moneyInvariant.ts convex/lib/moneyInvariant.test.ts \
  convex/lib/incomeAllocation.ts convex/lib/incomeAllocation.test.ts \
  shared/lib/incomeAllocation.ts
git commit -m "feat(finance): add allocation plan invariants in cents"
```

---

### Task 2: Schema — unallocated, reservations, allocation lines, internal transfers

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/migrations/markLegacyAllocationsForReview.ts`

**Interfaces:**
- Produces: tables usable by later mutations
- Consumes: existing `financialCycles`, `incomeEvents`, `fixedCommitments`, `subEnvelopes`

- [ ] **Step 1: Extend schema**

Add to `financialCycles`:
```typescript
unallocatedCents: v.optional(v.number()), // integer cents; treat missing as 0
needsReview: v.optional(v.boolean()),
```

Add tables:
```typescript
commitmentReservations: defineTable({
  profileId: v.id("profiles"),
  cycleId: v.id("financialCycles"),
  commitmentId: v.id("fixedCommitments"),
  incomeEventId: v.optional(v.id("incomeEvents")),
  reservedCents: v.number(),
  status: v.union(
    v.literal("active"),
    v.literal("partially_consumed"),
    v.literal("consumed"),
    v.literal("released"),
  ),
  consumedCents: v.number(), // default 0
  releasedCents: v.number(), // default 0
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_cycle", ["cycleId"])
  .index("by_commitment_cycle", ["commitmentId", "cycleId"])
  .index("by_profile_status", ["profileId", "status"]),

incomeAllocationLines: defineTable({
  profileId: v.id("profiles"),
  cycleId: v.id("financialCycles"),
  incomeEventId: v.id("incomeEvents"),
  destination: v.union(
    v.literal("envelope_needs"),
    v.literal("envelope_wants"),
    v.literal("envelope_savings"),
    v.literal("commitment_reservation"),
    v.literal("savings_contribution"),
    v.literal("unallocated"),
  ),
  amountCents: v.number(),
  commitmentId: v.optional(v.id("fixedCommitments")),
  reservationId: v.optional(v.id("commitmentReservations")),
  subEnvelopeId: v.optional(v.id("subEnvelopes")),
  contributionKind: v.optional(
    v.union(v.literal("objective"), v.literal("additional")),
  ),
  createdAt: v.number(),
})
  .index("by_income_event", ["incomeEventId"])
  .index("by_cycle", ["cycleId"]),

internalTransfers: defineTable({
  profileId: v.id("profiles"),
  cycleId: v.id("financialCycles"),
  kind: v.union(
    v.literal("cycle_correction"),
    v.literal("reservation_release"),
    v.literal("reservation_from_envelope"),
    v.literal("envelope_rebalance"),
    v.literal("unallocated_to_envelope"),
    v.literal("unallocated_to_reservation"),
    v.literal("unallocated_to_savings"),
    v.literal("savings_to_unallocated"),
  ),
  amountCents: v.number(),
  from: v.string(), // account key e.g. envelope:needs | unallocated | reservation:<id>
  to: v.string(),
  note: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_cycle", ["cycleId"]),
```

Extend `surplusContributions` with optional:
```typescript
contributionKind: v.optional(
  v.union(v.literal("objective"), v.literal("additional")),
), // missing → treat as "additional" (historical moveSurplus)
```

Keep `heldCents` for backward compatibility; new flow prefers `commitmentReservations` and sets `heldCents` = sum of reservation lines for that event (so cascade still sees a pool) **or** updates cascade to read reservations directly (preferred in Task 4).

- [ ] **Step 2: Migration (dev only) — mark legacy, do not invent**

```typescript
// convex/migrations/markLegacyAllocationsForReview.ts
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const markLegacyAllocationsForReview = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  returns: v.object({
    cyclesTouched: v.number(),
    dryRun: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const cycles = await ctx.db.query("financialCycles").collect();
    let cyclesTouched = 0;
    for (const cycle of cycles) {
      if (cycle.status !== "active") continue;
      const hasLines = await ctx.db
        .query("incomeAllocationLines")
        .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
        .first();
      if (hasLines) continue;
      // Legacy: keep envelopes as-is; mark review; do NOT convert remaining → contributions.
      cyclesTouched += 1;
      if (!dryRun) {
        await ctx.db.patch(cycle._id, {
          needsReview: true,
          unallocatedCents: cycle.unallocatedCents ?? 0,
        });
      }
    }
    return { cyclesTouched, dryRun };
  },
});
```

- [ ] **Step 3: Push schema to anonymous Convex dev**

Run: `CONVEX_AGENT_MODE=anonymous npx convex dev --once --typecheck disable`
Expected: schema accepted

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/migrations/markLegacyAllocationsForReview.ts
git commit -m "feat(schema): allocation lines, reservations, internal transfers"
```

---

### Task 3: Rewrite cycle savings breakdown (real contributions only)

**Files:**
- Modify: `convex/lib/cycleSavingsBreakdown.ts`
- Modify: `convex/lib/cycleSavingsBreakdown.test.ts`
- Modify: `convex/savings.ts` (`buildCycleSavingsBreakdown`)
- Modify: `modules/savings/types.ts`, `constants.ts`, `components/cycle-savings-section.tsx`

**Interfaces:**
- Consumes: income allocation lines + surplusContributions + savings envelope + subEnvelope contribution deltas
- Produces:
```typescript
type CycleSavingsBreakdownNumbers = {
  savingsObjectiveTargetCents: number; // planned into savings envelope this cycle
  savingsObjectiveContributedCents: number; // confirmed objective contributions
  savingsAdditionalCents: number; // confirmed additional only
  savingsCycleContributedCents: number; // objectiveContributed + additional
  savingsEnvelopeRemainingCents: number; // still in cycle savings envelope (not yet in Fondo)
  // legacy aliases mapped carefully for UI migration:
  savingsObjectiveCents: number; // = objectiveContributed (display “aportado a meta”)
  savingsTotalCents: number; // = savingsCycleContributedCents
  ...
};
```

- [ ] **Step 1: Failing tests for “unspent is not additional”**

```typescript
it("does not treat envelope remaining or unspent needs as additional", () => {
  const result = computeCycleSavingsBreakdown({
    incomeEvents: [
      {
        distributionApplied: { needs: 100_000, wants: 50_000, savings: 99_080 },
        distributionPolicy: "profile_default",
      },
    ],
    surplusContributions: [],
    allocationLines: [],
    savingsEnvelope: {
      allocatedAmount: 99_080,
      remainingAmount: 99_080,
    },
  });
  expect(result.savingsObjectiveTargetCents).toBe(99_080);
  expect(result.savingsObjectiveContributedCents).toBe(0);
  expect(result.savingsAdditionalCents).toBe(0);
  expect(result.savingsCycleContributedCents).toBe(0);
});

it("counts confirmed additional surplus only when persisted", () => {
  const result = computeCycleSavingsBreakdown({
    incomeEvents: [],
    surplusContributions: [{ amount: 68_567, contributionKind: "additional" }],
    allocationLines: [
      {
        destination: "savings_contribution",
        amountCents: 50_000,
        contributionKind: "objective",
      },
    ],
    savingsEnvelope: { allocatedAmount: 50_000, remainingAmount: 0 },
  });
  expect(result.savingsObjectiveContributedCents).toBe(50_000);
  expect(result.savingsAdditionalCents).toBe(68_567);
  expect(result.savingsCycleContributedCents).toBe(118_567);
});
```

- [ ] **Step 2: Implement rewrite** — stop using `sumObjectiveSavingsFromEvents` as “saved”; use allocation lines + surplusContributions + `computeSavingsSetAsideCents` only as “moved from envelope toward Fondo” when no lines exist (legacy fallback: setAside = objectiveContributed approximation, **additional = only surplusContributions**, never `all_to_savings` auto).

Legacy fallback rule (explicit):
- `savingsObjectiveTargetCents` = Σ `distributionApplied.savings` (plan)
- `savingsObjectiveContributedCents` = if lines exist → Σ objective contribution lines; else `min(setAside, target)`
- `savingsAdditionalCents` = Σ surplusContributions only (ignore `all_to_savings` for additional display)
- Document that `all_to_savings` increases target/envelope, not “adicional”, until user confirms move or contribution line

- [ ] **Step 3: Update savings UI copy** so “Ahorro del ciclo” = `savingsCycleContributedCents`; parked copy remains only when contributed money is in Fondo (`remaining == 0` and contributed > 0).

- [ ] **Step 4: Run** `pnpm exec vitest run convex/lib/cycleSavingsBreakdown.test.ts`
- [ ] **Step 5: Commit** `feat(savings): count only confirmed contributions as cycle savings`

---

### Task 4: Commitment reservations + pay/cancel without double charge

**Files:**
- Create: `convex/lib/commitmentReservation.ts` + `.test.ts`
- Modify: `convex/lib/commitmentCoverage.ts` (fund from active reservations first)
- Modify: `convex/fixedCommitments.ts`
- Modify: `convex/lib/commitmentPayment.ts` (optional pay that consumes reserve)
- Modify: commitments UI

**Interfaces:**
```typescript
resolveReservationStatus({ amount, reservedActive, consumed }): 
  "pending" | "partially_reserved" | "fully_reserved" | "paid" | "cancelled"

applyPayCommitment({ dueCents, activeReservations, envelopeRemaining }):
  { fromReserve, fromEnvelope, patches }
```

- [ ] **Step 1: Tests** — partial reserve, full reserve, pay uses reserve first, cancel releases to unallocated, no double deduct.

- [ ] **Step 2: Implement pure helpers + mutations**
  - `reserveCommitmentFunds`
  - `releaseCommitmentReservation`
  - `markCommitmentAsPaid` extended: consume reservations, then optionally debit envelope once for remainder; write expense only for envelope portion (or expense with metadata `fundedByReserveCents`)

Decision (preserve traceability): when paying:
1. Consume active reservation cents (status → consumed/partially_consumed).
2. If remainder > 0, debit the commitment’s envelope and insert `expenses` for remainder only.
3. Record internal transfer / allocation line for reserve consumption (not income).
4. Set `paidAt` / `paidForCycleId` as today.

- [ ] **Step 3: Wire UI** — commitment detail shows Reservado / Falta reservar / Pagado.

- [ ] **Step 4: Commit** `feat(commitments): explicit reservations with pay-from-reserve`

---

### Task 5: Spendable balance + dashboard surfaces

**Files:**
- Create: `convex/lib/spendableBalance.ts` + `.test.ts`
- Modify: `convex/dashboard.ts`
- Modify: `modules/dashboard/components/*` (hero, envelopes, small reserved/unallocated strip)

**Interfaces:**
```typescript
computeSpendableSnapshot({
  needsRemaining, wantsRemaining, savingsRemaining,
  unallocatedCents, activeReservedCents, daysRemaining
}): {
  spendableCents, // needsRemaining + wantsRemaining (+ unallocated only if policy says spendable; default: unallocated NOT spendable until assigned)
  reservedCents,
  unallocatedCents,
  savingsParkedInEnvelopeCents, // savingsRemaining
  dailyAvailableCents, // floor(spendableCents / days) OR keep wants-only daily? 
}
```

**Product decision (locked):**  
Daily “puedes gastar” = `floor((wantsRemaining + max(0, needsRemaining)) / daysRemaining)` **excluding** reserved and unallocated and savings envelope. Unallocated is shown as “Por repartir”, not spendable. This matches “sin arruinar el mes” better than wants-only once needs holds true spend budget.

Alternative if too sharp vs current coach: keep daily from wants only but show separate “Disponible en sobres” total. Prefer single truthful spendable total + daily derived from that total.

- [ ] **Step 1–4:** TDD + wire + commit `feat(dashboard): spendable vs reserved vs unallocated`

---

### Task 6: Income registration distribution flow

**Files:**
- Modify: `convex/incomeEvents.ts` (`createIncomeEvent` accepts `allocation`)
- Modify: `modules/income/schemas.ts`, `impactPreview.ts`, register form components
- Create: `modules/income/components/income-allocation-step.tsx`
- Modify: `modules/income/constants.ts`

**Behavior:**
1. User enters amount + source (existing).
2. New step: distribute among commitments (reserve), envelopes (editable split of remaining), optional contribute to Fondo now, leave unallocated.
3. Preview: Puedes gastar / Reservado / Ahorro aportado / Por repartir.
4. Confirm → mutation writes incomeEvent + allocation lines + reservations + envelope patches + optional subEnvelope contributions + cycle.unallocatedCents.

**Backward compat:** If `allocation` omitted, default plan = current behavior but:
- `heldCents` still supported
- do **not** treat leftover as additional
- set `needsReview` if creating without allocation on a cycle that already has money? Only for correction entry points.

For new UI, allocation is required (form always sends plan). API may keep optional allocation for tests/scripts.

- [ ] **Step 1: Tests** for create with allocation (unit of pure apply + mutation-level if available).
- [ ] **Step 2: Mutation**
- [ ] **Step 3: UI step**
- [ ] **Step 4: Commit** `feat(income): explicit distribution on register`

---

### Task 7: Correct active cycle (no fake income/expense)

**Files:**
- Create: `convex/lib/cycleCorrection.ts` + `.test.ts`
- Create: `convex/cycleCorrection.ts`
- Create: `modules/cycle-correction/*` + route `app/(app)/cycle/correct/page.tsx`
- Entry from Ajustes or banner when `needsReview`

**Scenario validation (not hardcoded in code):**  
After correction, user can represent ~S/ 1,500 in Fondo, ~S/ 100 spendable, debt reserved, additional only if confirmed.

Correction input:
```typescript
{
  reserveToCommitments: [{ commitmentId, amountCents }],
  setEnvelopeRemaining: { needs, wants, savings }, // absolute targets for remaining; allocated adjusted via internal transfers
  contributeToSavings: [{ amountCents, kind, subEnvelopeId? }],
  setUnallocatedCents: number,
  note?: string,
}
```

Algorithm:
1. Snapshot current envelopes, reservations, unallocated, fondo.
2. Compute deltas.
3. Apply via `internalTransfers` + patches; never insert incomeEvents/expenses for the correction itself.
4. Clear erroneous mental “additional” by not creating surplusContributions unless user confirms contribute kind additional.
5. Recompute coverage; clear `needsReview` when spendable+reserved+unallocated+savingsRemaining+fondo deltas reconcile to prior total liquid (invariant test).

- [ ] **Steps:** TDD invariant conservation → mutation → UI → commit `feat(cycle): correct allocation via internal transfers`

---

### Task 8: Second income during active cycle

**Files:** same as Task 6; tests in `convex/lib/incomeAllocation.test.ts` + income event tests

Rules:
- Does **not** retroactively rewrite prior `distributionApplied`
- Opens allocation flow for the **new** amount only
- Adds to envelopes/reservations/unallocated per plan
- Unspent prior envelope balances stay; not auto-converted to additional

- [ ] Test + commit `test(income): later payday allocates without rewriting prior envelopes`

---

### Task 9: Full invariant + scenario test suite

**Files:**
- Create: `convex/lib/financialInvariants.test.ts`
- Extend reservation/allocation/savings/spendable tests

Cover minimum list from product request:
1. Initial income fully distributed  
2. Later income in active cycle  
3. Debt reserved  
4. Partial reservation  
5. Pay with reserve  
6. Cancel + release  
7. Objective contribution  
8. Explicit additional  
9. Unspent ≠ automatic additional  
10. Edit allocation via internal transfer  
11. No double count  
12. Cent precision  
13. Legacy migration marks review  
14. Daily available from spendable  

- [ ] Run: `pnpm exec vitest run convex/lib`
- [ ] Commit `test(finance): allocation ledger invariants`

---

### Task 10: Wire polish, dead code removal, docs, quality gates

**Files:**
- Remove dead paths that auto-label `all_to_savings` as “Ahorro adicional” in UI
- Update `docs/QUIPU-MASTER.md` §5.1–5.3 + changelog
- Lint/typecheck/test

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm exec vitest run`
- [ ] Manual smoke on anonymous Convex: register → allocate → reserve debt → contribute savings → correct cycle → verify Home + Ahorros
- [ ] Commit `docs: domain rules for allocation ledger` + final fixup commits

---

## Self-review

1. **Spec coverage:** Domain distinctions 1–9, income flow, reservations, savings rewrite, cycle correction, migration, UX, tests, verification — each maps to Tasks 1–10.
2. **Placeholders:** None intentional; implementers must use the code blocks above.
3. **Type consistency:** `AllocationPlan`, `contributionKind`, `unallocatedCents`, reservation `status` names are stable across tasks.
4. **Platform:** Next.js modules, not RN — called out in Global Constraints.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-31-income-allocation-ledger.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with executing-plans checkpoints  

As a cloud agent, proceed with **Inline Execution** unless interrupted.
