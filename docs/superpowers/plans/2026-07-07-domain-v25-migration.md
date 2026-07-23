# Quipu v2.5 Domain Migration — Implementation Plan

> ⚠️ **STATUS: EJECUTADO** (rama `chore/quipu-2.0`, commits `b70dda1`–`8a04b03`, 2026-07-08). Las 28 tareas de este plan están completas.
>
> **Fuentes de verdad actuales:**
> - Decisiones de modelo: `docs/superpowers/specs/2026-07-07-domain-v25-audit-design.md` (es la spec que este plan implementó).
> - Operaciones en producción: `docs/migrations/2026-07-07-v25-migration.md` (runbook ejecutable, 25 líneas).
> - Estado del código: `convex/_generated/dataModel.d.ts` (tipos generados por `npx convex dev`).
>
> Este doc se conserva como **archivo histórico** del plan ejecutado. No es la fuente de verdad del modelo.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Quipu's Convex schema and mutations from the v2.0 (workerType/payday-based) model to v2.5 (incomeModel/event-driven model) in three phases (widen → migrate → narrow), with TDD on the pure logic layer and manual smoke tests on the mutation layer.

**Architecture:** Convex is the single source of truth. We extend the schema with new fields and a new `incomeEvents` table (widen), backfill data from old fields and `adHocIncomes` (migrate), then update the mutation code to use the new model and remove old fields (narrow). All business logic in `convex/lib/budgetMath.ts` is covered by vitest unit tests.

**Tech Stack:** Convex 1.42, TypeScript 6, vitest 4, TanStack Form 1.33, Zod 4, Next.js 16, React 19, Biome 2.5.

---

## Global Constraints

- **No placeholders.** Every step shows the actual code, file paths, and commands. An engineer reading any task in isolation must be able to execute it.
- **One commit per task minimum.** Conventional commit prefixes: `feat:`, `chore:`, `test:`, `refactor:`, `docs:`. Subject line < 50 chars, no trailing period, imperative mood.
- **TDD discipline** in `convex/lib/`. Write the failing test first, run it, implement, run it again, commit.
- **Smoke-test discipline** in Convex mutations. After every change to a mutation, run `npx convex dev` in another terminal, then exercise the mutation in `npx convex dashboard` with a test user.
- **No manual edits to `convex/_generated/`.** Regenerate with `npx convex dev` after any schema change.
- **No `cacheComponents: true` in `next.config.ts`.** (Per project constitution.)
- **No `memo`/`useMemo`/`useCallback` manual.** React Compiler is on.
- **Spanish for user-facing copy and error messages. English for code (variables, functions, types).**
- **Types from `convex/_generated/dataModel`.** No redeclared `Doc`/`Id` types. Derive view models with `Pick`/`Omit` if needed.
- **Money in integer cents (`number`).** Use `shared/lib/money.ts` for formatting/parsing in UI. Never format PEN by hand in a component.
- **Dates in `America/Lima`.** Use `shared/lib/date.ts`.
- **Errors are typed (`ConvexError({ code, message })`), never raw `throw new Error("...")`.** Use codes from the `ErrorCode` enum in `core/errors/index.ts`.
- **Biome formats and lints.** Run `pnpm lint` and `pnpm format` after every file change. CI would fail otherwise.
- **Typecheck green.** Run `pnpm tsc --noEmit` after every type change. CI would fail otherwise. In the widen phase, when a schema field becomes `v.optional` and production code reads it as required, the task MAY add a defensive `?? default` at the read site so typecheck stays clean. The brief may say "do NOT touch production code" — that prohibition applies to the `createProfile`/`createFixedCommitment` mutations specifically (which will be reworked in narrow), not to the read sites in `paydayEngine.ts`, `coachEngine.ts`, or `updateProfileSettings` which need minimal defensive defaults to keep typecheck green.

---

## Phase 0: Setup

### Task 1: Verify test infrastructure works

**Files:**
- Create: `convex/lib/budgetMath.test.ts`
- No production code changes

**Context:** The project has `vitest@^4.1.10` and a `vitest.config.mts` at the repo root, but no test files exist. We need a single sanity-check test to prove the runner works before writing the first real test.

**Interfaces:**
- Consumes: existing `computeAllocations` from `convex/lib/budgetMath.ts` (read-only import).
- Produces: nothing in production code.

- [ ] **Step 1: Write a sanity-check test**

Create `convex/lib/budgetMath.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeAllocations } from "./budgetMath";

describe("budgetMath smoke", () => {
  it("computeAllocations distributes exactly the input amount", () => {
    const result = computeAllocations(10000, {
      allocationNeeds: 50,
      allocationWants: 30,
      allocationSavings: 20,
    });
    const sum = result.needs + result.wants + result.savings;
    expect(sum).toBe(10000);
  });
});
```

- [ ] **Step 2: Run the test and verify it passes**

Run: `pnpm test convex/lib/budgetMath.test.ts`
Expected: 1 test passes (`budgetMath smoke > computeAllocations distributes exactly the input amount`).

- [ ] **Step 3: Commit**

```bash
git add convex/lib/budgetMath.test.ts vitest.config.mts
git commit -m "test: add sanity check for budgetMath"
```

Note: `vitest.config.mts` is added in case it was untracked. If it is already tracked, remove it from the add command.

---

## Phase 1: Widen (add new fields and tables, no behavior change)

### Task 2: Add `incomeModel` to `profiles` (optional in schema)

**Files:**
- Modify: `convex/schema.ts:18-44` (the `profiles` table definition)
- No test (this is a schema change; smoke-test after deploy)

**Context:** In v2.5, `workerType` is replaced by `incomeModel: "fixed" | "variable" | "mixed"`. In the widen phase we add it as **optional** to avoid breaking existing rows. We do NOT remove `workerType` yet. The production code does not read `incomeModel` yet.

- [ ] **Step 1: Edit `convex/schema.ts`**

In the `profiles` table definition, add this field after `currencySymbol`:

```ts
    // v2.5: how the user organizes their income cycle (replaces workerType)
    incomeModel: v.optional(
      v.union(
        v.literal("fixed"),
        v.literal("variable"),
        v.literal("mixed"),
      ),
    ),
```

- [ ] **Step 2: Make `payFrequency` and `paydays` optional in the schema**

In the same `profiles` table, change:

```ts
    payFrequency: v.union(v.literal("monthly"), v.literal("biweekly")),
    paydays: v.array(v.number()),
```

to:

```ts
    payFrequency: v.optional(
      v.union(v.literal("monthly"), v.literal("biweekly")),
    ),
    paydays: v.optional(v.array(v.number())),
```

Important: do NOT touch `convex/profiles.ts:createProfile` yet. The mutation's `args` still requires these fields. The schema is more permissive than the mutation; that's fine in the widen phase.

- [ ] **Step 3: Regenerate types**

Run: `npx convex dev` (in a separate terminal if not already running, or run for 5s and let it exit).
Expected: `convex/_generated/dataModel.d.ts` is updated with `incomeModel`, optional `payFrequency`, optional `paydays`.

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/_generated/
git commit -m "feat(schema): add incomeModel to profiles (widen)"
```

---

### Task 3: Add `totalIncomeReceived` to `financialCycles` (optional)

**Files:**
- Modify: `convex/schema.ts:47-55` (the `financialCycles` table definition)

**Context:** In v2.5, the trio `baseIncomeReceived` / `extraordinaryIncomeReceived` / `totalPeriodIncome` is replaced by a single `totalIncomeReceived` snapshot. In the widen phase we add it as optional and leave the old fields intact.

- [ ] **Step 1: Edit `convex/schema.ts`**

In the `financialCycles` table definition, add this field after `totalPeriodIncome`:

```ts
    // v2.5: unified total, replaces base+extraordinary+totalPeriodIncome
    totalIncomeReceived: v.optional(v.number()),
```

- [ ] **Step 2: Regenerate types and typecheck**

Run: `npx convex dev`
Then: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts convex/_generated/
git commit -m "feat(schema): add totalIncomeReceived to cycles (widen)"
```

---

### Task 4: Add `incomeEvents` table

**Files:**
- Modify: `convex/schema.ts` (add a new table after `cycleHistory`)

**Context:** `incomeEvents` is the v2.5 unification of "salary" + "ad-hoc income" + "extraordinary income" into a single event log. The table is created empty. We do NOT migrate `adHocIncomes` data yet (that's Phase 2).

- [ ] **Step 1: Edit `convex/schema.ts`**

Add this table definition after the `cycleHistory` table and before the `adHocIncomes` table:

```ts
  // v2.5: unified income event log. Replaces the implicit "salary vs cachuelo"
  // distinction that lived in financialCycles.baseIncomeReceived +
  // adHocIncomes in v2.0.
  incomeEvents: defineTable({
    profileId: v.id("profiles"),
    cycleId: v.id("financialCycles"),
    amount: v.number(), // integer cents, > 0
    source: v.union(
      v.literal("payroll"),
      v.literal("freelance"),
      v.literal("business"),
      v.literal("gift"),
      v.literal("refund"),
      v.literal("investment"),
      v.literal("other"),
    ),
    description: v.string(), // always required
    occurredAt: v.number(), // timestamp, can be retroactive
    distributionApplied: v.object({
      needs: v.number(),
      wants: v.number(),
      savings: v.number(),
    }),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_profile_time", ["profileId", "occurredAt"]),
```

- [ ] **Step 2: Regenerate types and typecheck**

Run: `npx convex dev`
Then: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts convex/_generated/
git commit -m "feat(schema): add incomeEvents table (widen)"
```

---

### Task 5: Add `dueDay` to `fixedCommitments` (optional)

**Files:**
- Modify: `convex/schema.ts:81-92` (the `fixedCommitments` table definition)

**Context:** In v2.5, `frequency: "monthly" | "first_payday" | "second_payday" | "every_payday"` is replaced by `dueDay: number` (1-31). The commitment lives in the calendar, not in the cycle. In the widen phase we add `dueDay` as optional and leave `frequency` intact.

- [ ] **Step 1: Edit `convex/schema.ts`**

In the `fixedCommitments` table definition, add this field after `envelope`:

```ts
    // v2.5: day of the month (Lima) the commitment is due. Replaces frequency.
    dueDay: v.optional(v.number()), // 1-31
```

Also add a new index below the existing `.index("by_profileId", ["profileId"])`:

```ts
    .index("by_profile_dueDay", ["profileId", "dueDay"]),
```

So the table block becomes:

```ts
  fixedCommitments: defineTable({
    profileId: v.id("profiles"),
    name: v.string(),
    amount: v.number(),
    frequency: v.union(
      v.literal("monthly"),
      v.literal("first_payday"),
      v.literal("second_payday"),
      v.literal("every_payday"),
    ),
    envelope: v.union(v.literal("needs"), v.literal("wants")),
    // v2.5: day of the month (Lima) the commitment is due. Replaces frequency.
    dueDay: v.optional(v.number()), // 1-31
  })
    .index("by_profileId", ["profileId"])
    .index("by_profile_dueDay", ["profileId", "dueDay"]),
```

- [ ] **Step 2: Regenerate types and typecheck**

Run: `npx convex dev`
Then: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts convex/_generated/
git commit -m "feat(schema): add dueDay to fixedCommitments (widen)"
```

---

### Task 6: Smoke test widen deploy

**Files:** none

**Context:** After widening the schema, we need to verify the existing v2.0 code still works against the new schema. The schema is now *more permissive* than the code: old fields still exist, new fields are optional. Code reading old fields still works. Code that doesn't know about new fields doesn't break.

- [ ] **Step 1: Run typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Run linter**

Run: `pnpm lint`
Expected: no new errors. (Biome may reformat; that's fine.)

- [ ] **Step 3: Start Convex dev and verify it deploys**

In one terminal, run: `npx convex dev`
Expected: Convex reports "deployed" or similar success, with the new schema in place.

- [ ] **Step 4: Verify existing flows still work (manual smoke)**

In another terminal, run: `pnpm dev`
Visit: `http://localhost:3000/sign-in`. Create a test account with passkey. Verify the existing onboarding (v2.0) still works end to end. Verify you can register a payday, an expense, and a coach interaction. If any of these break, the widen phase has a bug; revert to the previous commit and investigate.

- [ ] **Step 5: Document the deploy in a comment on the PR**

When you open a PR for the widen phase, add a checklist:

```markdown
## Phase 1 (Widen) — schema-only changes
- [x] `profiles.incomeModel` added (optional)
- [x] `profiles.payFrequency` made optional
- [x] `profiles.paydays` made optional
- [x] `financialCycles.totalIncomeReceived` added (optional)
- [x] `incomeEvents` table created (empty)
- [x] `fixedCommitments.dueDay` added (optional)
- [x] `fixedCommitments` index `by_profile_dueDay` added
- [x] No existing flow broken
- [x] Deploy successful
```

---

## Phase 2: Migrate (backfill data, no code behavior change)

### Task 7: Write TDD test for `backfillIncomeModel` helper

**Files:**
- Create: `convex/lib/migrations.test.ts`
- Create: `convex/lib/migrations.ts`

**Context:** The backfill logic is pure (input: a v2.0 profile, output: the v2.5 `incomeModel` value). It belongs in `convex/lib/` with TDD coverage. We extract it from any Convex context so it's easy to test.

**Interfaces:**
- Consumes: a profile-shaped object with `workerType: "dependent" | "independent" | undefined`.
- Produces: `"fixed" | "variable"`.

- [ ] **Step 1: Write the failing test**

Create `convex/lib/migrations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { backfillIncomeModel } from "./migrations";

describe("backfillIncomeModel", () => {
  it("maps workerType=dependent to incomeModel=fixed", () => {
    expect(backfillIncomeModel({ workerType: "dependent" })).toBe("fixed");
  });

  it("maps workerType=independent to incomeModel=variable", () => {
    expect(backfillIncomeModel({ workerType: "independent" })).toBe("variable");
  });

  it("defaults to variable when workerType is missing", () => {
    // Defensive: a row that somehow lost workerType. Better to be variable
    // (more permissive: user can change it in settings) than to fail.
    expect(backfillIncomeModel({})).toBe("variable");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test convex/lib/migrations.test.ts`
Expected: FAIL with "Cannot find module './migrations'" or similar.

- [ ] **Step 3: Implement the helper**

Create `convex/lib/migrations.ts`:

```ts
type V2WorkerType = "dependent" | "independent";

export function backfillIncomeModel(profile: {
  workerType?: V2WorkerType;
}): "fixed" | "variable" {
  if (profile.workerType === "dependent") return "fixed";
  return "variable";
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm test convex/lib/migrations.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/lib/migrations.ts convex/lib/migrations.test.ts
git commit -m "feat(lib): add backfillIncomeModel helper"
```

---

### Task 8: Write TDD test for `backfillCommitmentDueDay` helper

**Files:**
- Modify: `convex/lib/migrations.test.ts`
- Modify: `convex/lib/migrations.ts`

**Context:** The `dueDay` backfill takes a v2.0 commitment (`frequency` + the profile's `paydays[]`) and returns a `dueDay: number` (1-31). Edge cases: missing `paydays`, `every_payday` (lose to default), `monthly` (default to 1), `first_payday`/`second_payday` (use the corresponding day).

**Interfaces:**
- Consumes: `{ frequency: "monthly" | "first_payday" | "second_payday" | "every_payday", paydays?: number[] }`.
- Produces: `number` in `[1, 31]`.

- [ ] **Step 1: Append the failing test**

Append to `convex/lib/migrations.test.ts`:

```ts
import { backfillCommitmentDueDay } from "./migrations";

describe("backfillCommitmentDueDay", () => {
  it("maps monthly to day 1", () => {
    expect(backfillCommitmentDueDay({ frequency: "monthly" })).toBe(1);
  });

  it("uses paydays[0] for first_payday when paydays present", () => {
    expect(
      backfillCommitmentDueDay({ frequency: "first_payday", paydays: [15, 30] }),
    ).toBe(15);
  });

  it("uses paydays[1] for second_payday when paydays present", () => {
    expect(
      backfillCommitmentDueDay({ frequency: "second_payday", paydays: [15, 30] }),
    ).toBe(30);
  });

  it("uses paydays[0] for every_payday when paydays present (lossy)", () => {
    // The user had the commitment billed on both paydays. v2.5 can only
    // represent one day. We pick the first; the user can adjust in settings.
    expect(
      backfillCommitmentDueDay({ frequency: "every_payday", paydays: [15, 30] }),
    ).toBe(15);
  });

  it("falls back to day 1 when paydays is missing for first/second/every", () => {
    expect(backfillCommitmentDueDay({ frequency: "first_payday" })).toBe(1);
    expect(backfillCommitmentDueDay({ frequency: "second_payday" })).toBe(1);
    expect(backfillCommitmentDueDay({ frequency: "every_payday" })).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test convex/lib/migrations.test.ts`
Expected: FAIL with "backfillCommitmentDueDay is not a function".

- [ ] **Step 3: Implement the helper**

Append to `convex/lib/migrations.ts`:

```ts
type V2CommitmentFrequency =
  | "monthly"
  | "first_payday"
  | "second_payday"
  | "every_payday";

const FALLBACK_DUE_DAY = 1;

export function backfillCommitmentDueDay(input: {
  frequency: V2CommitmentFrequency;
  paydays?: number[];
}): number {
  if (input.frequency === "monthly") return FALLBACK_DUE_DAY;
  if (!input.paydays || input.paydays.length === 0) return FALLBACK_DUE_DAY;
  if (input.frequency === "first_payday") return input.paydays[0]!;
  if (input.frequency === "second_payday") return input.paydays[1] ?? input.paydays[0]!;
  // every_payday: lossy. Pick the first.
  return input.paydays[0]!;
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm test convex/lib/migrations.test.ts`
Expected: 8 tests pass (3 from Task 7 + 5 from this task).

- [ ] **Step 5: Commit**

```bash
git add convex/lib/migrations.ts convex/lib/migrations.test.ts
git commit -m "feat(lib): add backfillCommitmentDueDay helper"
```

---

### Task 9: Write the backfill mutation for `profiles`

**Files:**
- Create: `convex/migrations.ts`

**Context:** This is the actual Convex mutation that runs against the database. It iterates all profiles, computes the backfilled `incomeModel` + `payFrequency` + `paydays` per profile, and patches each row. Idempotent (safe to re-run).

**Interfaces:**
- Consumes: nothing (reads all profiles).
- Produces: `{ profilesUpdated: number }`.

- [ ] **Step 1: Create the mutation file**

Create `convex/migrations.ts`:

```ts
import { internalMutation } from "./_generated/server";
import {
  backfillCommitmentDueDay,
  backfillIncomeModel,
} from "./lib/migrations";

/**
 * Backfill v2.5 fields from v2.0 fields.
 *
 * Idempotent: safe to re-run. Existing v2.5 values are preserved.
 */
export const backfillProfilesV25 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    let updated = 0;

    for (const profile of profiles) {
      // Skip if already migrated to v2.5 (incomeModel is set).
      if (profile.incomeModel !== undefined) continue;

      const incomeModel = backfillIncomeModel({
        workerType: profile.workerType,
      });

      // If the backfilled model is variable, payFrequency and paydays must
      // be cleared. If fixed, keep them.
      const updates: {
        incomeModel: "fixed" | "variable";
        payFrequency?: undefined;
        paydays?: undefined;
      } = { incomeModel };

      if (incomeModel === "variable") {
        updates.payFrequency = undefined;
        updates.paydays = undefined;
      }

      await ctx.db.patch(profile._id, updates);
      updated++;
    }

    return { profilesUpdated: updated };
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Smoke test the mutation**

In `npx convex dashboard`, navigate to Functions → `migrations:backfillProfilesV25`. Run it on your dev deployment. Verify it returns `{ profilesUpdated: <number> }`. Verify in the Data viewer that a profile's `incomeModel` is now set, and that variable profiles have `payFrequency` and `paydays` cleared.

- [ ] **Step 4: Commit**

```bash
git add convex/migrations.ts
git commit -m "feat(migration): add profiles v2.5 backfill"
```

---

### Task 10: Write the backfill mutation for `financialCycles`

**Files:**
- Modify: `convex/migrations.ts`

**Context:** Same pattern, but for `financialCycles`. Compute `totalIncomeReceived = baseIncomeReceived + extraordinaryIncomeReceived` and patch each cycle.

- [ ] **Step 1: Append the new mutation to `convex/migrations.ts`**

```ts
export const backfillCyclesV25 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cycles = await ctx.db.query("financialCycles").collect();
    let updated = 0;

    for (const cycle of cycles) {
      if (cycle.totalIncomeReceived !== undefined) continue;
      const total = cycle.baseIncomeReceived + cycle.extraordinaryIncomeReceived;
      await ctx.db.patch(cycle._id, { totalIncomeReceived: total });
      updated++;
    }

    return { cyclesUpdated: updated };
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Smoke test the mutation**

In `npx convex dashboard`, run `migrations:backfillCyclesV25`. Verify the result. Verify in Data viewer that cycles now have `totalIncomeReceived` set.

- [ ] **Step 4: Commit**

```bash
git add convex/migrations.ts
git commit -m "feat(migration): add financialCycles v2.5 backfill"
```

---

### Task 11: Write the backfill mutation for `fixedCommitments`

**Files:**
- Modify: `convex/migrations.ts`

**Context:** Compute `dueDay` per commitment using the profile's `paydays[]` (if it has them) and the commitment's `frequency`. Idempotent.

- [ ] **Step 1: Append the new mutation to `convex/migrations.ts`**

```ts
export const backfillCommitmentsV25 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const commitments = await ctx.db.query("fixedCommitments").collect();
    let updated = 0;

    for (const commitment of commitments) {
      if (commitment.dueDay !== undefined) continue;

      const profile = await ctx.db.get(commitment.profileId);
      const paydays = profile?.paydays;

      const dueDay = backfillCommitmentDueDay({
        frequency: commitment.frequency,
        paydays: paydays ?? undefined,
      });

      await ctx.db.patch(commitment._id, { dueDay });
      updated++;
    }

    return { commitmentsUpdated: updated };
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Smoke test the mutation**

In `npx convex dashboard`, run `migrations:backfillCommitmentsV25`. Verify the result. Verify in Data viewer that commitments now have `dueDay` set.

- [ ] **Step 4: Commit**

```bash
git add convex/migrations.ts
git commit -m "feat(migration): add fixedCommitments v2.5 backfill"
```

---

### Task 12: Write the backfill mutation for `adHocIncomes` → `incomeEvents`

**Files:**
- Modify: `convex/migrations.ts`

**Context:** One-to-one migration. Each `adHocIncomes` row becomes an `incomeEvents` row with `source: "other"` and the original `description` preserved. The `split` becomes `distributionApplied`. We add a flag `migratedToIncomeEvents: true` on the `adHocIncomes` row to make this idempotent; the flag is removed in the narrow phase.

- [ ] **Step 1: Add a new field to `adHocIncomes` schema (optional)**

In `convex/schema.ts`, in the `adHocIncomes` table definition, add:

```ts
    // v2.5: set to true when this row has been copied to incomeEvents.
    // Removed in the narrow phase.
    migratedToIncomeEvents: v.optional(v.boolean()),
```

- [ ] **Step 2: Regenerate types**

Run: `npx convex dev`

- [ ] **Step 3: Append the new mutation to `convex/migrations.ts`**

```ts
export const backfillIncomeEventsV25 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const adHoc = await ctx.db.query("adHocIncomes").collect();
    let created = 0;

    for (const income of adHoc) {
      if (income.migratedToIncomeEvents === true) continue;

      await ctx.db.insert("incomeEvents", {
        profileId: income.profileId,
        cycleId: income.cycleId,
        amount: income.amount,
        source: "other",
        description: income.description,
        occurredAt: income.timestamp,
        distributionApplied: income.split,
      });
      await ctx.db.patch(income._id, { migratedToIncomeEvents: true });
      created++;
    }

    return { incomeEventsCreated: created };
  },
});
```

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Smoke test the mutation**

In `npx convex dashboard`, run `migrations:backfillIncomeEventsV25`. Verify the result. Verify in Data viewer that `incomeEvents` has new rows and that each `adHocIncomes` row has `migratedToIncomeEvents: true`.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/migrations.ts convex/_generated/
git commit -m "feat(migration): backfill adHocIncomes to incomeEvents"
```

---

### Task 13: Add a migration runbook note

**Files:**
- Create: `docs/migrations/2026-07-07-v25-migration.md`

**Context:** The migrate phase has 4 mutations that must be run in order. We document the order and what to verify between each step so a future engineer (or you, in 6 months) can re-run this safely.

- [ ] **Step 1: Create the runbook**

Create `docs/migrations/2026-07-07-v25-migration.md`:

```markdown
# v2.5 migration runbook

## Order of operations

Run these mutations in this exact order against a deployment. Each is idempotent; safe to re-run.

1. `migrations:backfillProfilesV25`
   - Sets `incomeModel` on every profile.
   - Clears `payFrequency` and `paydays` on profiles migrated to `variable`.
2. `migrations:backfillCyclesV25`
   - Sets `totalIncomeReceived = base + extraordinary` on every cycle.
3. `migrations:backfillCommitmentsV25`
   - Sets `dueDay` on every commitment using the profile's `paydays`.
   - Trade-off: `every_payday` commitments lose to first payday only. Show users a banner in `/settings` asking them to verify.
4. `migrations:backfillIncomeEventsV25`
   - Copies every `adHocIncomes` row to a new `incomeEvents` row with `source: "other"`.
   - Trade-off: cannot distinguish migrated `other` from real `other` afterward.

## Pre-flight

- Snapshot the database (or at least the affected tables) before running.
- Confirm all 4 mutations return `0` for the `*Updated`/`*Created` field when run a second time (idempotency check).

## Post-flight

- `count(adHocIncomes) === count(incomeEvents where source = "other" and description matches the corresponding adHocIncomes.description)` (or similar — exact reconciliation may be tricky if `description` is duplicated).
- `count(profiles where incomeModel = undefined) === 0`
- `count(financialCycles where totalIncomeReceived = undefined) === 0`
- `count(fixedCommitments where dueDay = undefined) === 0`
```

- [ ] **Step 2: Commit**

```bash
git add docs/migrations/2026-07-07-v25-migration.md
git commit -m "docs: add v2.5 migration runbook"
```

---

### Task 14: Smoke test the migrate phase end-to-end

**Files:** none

**Context:** Confirm that after running all 4 migrations, the data is in the expected v2.5 state and the v2.0 code still works (since we haven't changed any code yet).

- [ ] **Step 1: Run all 4 migrations in order via `npx convex dashboard`**

In the order from the runbook.

- [ ] **Step 2: Verify the data**

In the Data viewer:
- `profiles`: all rows have `incomeModel` set. `variable` rows have `payFrequency` and `paydays` empty.
- `financialCycles`: all rows have `totalIncomeReceived` set.
- `fixedCommitments`: all rows have `dueDay` set.
- `incomeEvents`: has rows. `adHocIncomes`: every row has `migratedToIncomeEvents: true`.

- [ ] **Step 3: Re-run all 4 migrations and verify idempotency**

Re-run each one. All should return `0` for the updated/created count.

- [ ] **Step 4: Run the v2.0 app end-to-end**

`pnpm dev`. Sign in with a migrated user. Verify onboarding, payday, expense, coach still work. (They should, because the v2.0 code reads the old fields, which still exist.)

---

## Phase 3: Narrow (update code, remove old fields)

### Task 15: Add `ConvexError` migration in `convex/profiles.ts`

**Files:**
- Modify: `convex/profiles.ts` (lines 27-110, the `createProfile` mutation)

**Context:** v2.0 throws raw `new Error("...")`. v2.5 throws `ConvexError({ code, message })` with codes from `ErrorCode`. This is transversal but we do it here because the `createProfile` signature is changing.

**Interfaces:**
- Consumes: existing mutation `createProfile`.
- Produces: same mutation, errors are `ConvexError`.

- [ ] **Step 1: Add the import**

At the top of `convex/profiles.ts`, add:

```ts
import { ConvexError } from "convex/values";
```

- [ ] **Step 2: Replace each `throw new Error(...)` with `throw new ConvexError({ code, message })`**

In `createProfile`:

- Replace `throw new Error("No autorizado...")` with:

```ts
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
```

- Replace `throw new Error("El nombre es obligatorio.")` with:

```ts
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El nombre es obligatorio.",
        data: { field: "name" },
      });
```

- Replace `throw new Error("La distribución de sobres...")` with:

```ts
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message:
          "La distribución de sobres (Necesidades, Gustos, Ahorro) debe sumar exactamente 100% con valores enteros no negativos.",
        data: { field: "allocations" },
      });
```

- Replace `throw new Error("Los días de pago no son válidos...")` with:

```ts
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Los días de pago no son válidos para la frecuencia seleccionada.",
        data: { field: "paydays" },
      });
```

Same pattern in `updateProfileSettings` (lines 115-178): `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`.

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Smoke test the mutation**

In `npx convex dashboard`, call `createProfile` with invalid data and verify the error has a `code` field. Call it with valid data and verify it creates a profile (idempotently).

- [ ] **Step 5: Commit**

```bash
git add convex/profiles.ts
git commit -m "refactor(profiles): use ConvexError with ErrorCode"
```

---

### Task 16: Update `createProfile` to use v2.5 fields

**Files:**
- Modify: `convex/profiles.ts` (the `createProfile` mutation's `args` and `handler`)

**Context:** Now we change the `createProfile` mutation to use `incomeModel` instead of `workerType`, and to validate that `payFrequency` + `paydays` are present when `incomeModel ∈ {fixed, mixed}`.

**Interfaces:**
- Consumes: `args` change: add `incomeModel`, make `payFrequency` and `paydays` optional in the validator.
- Produces: persists a profile with the new v2.5 shape (no `workerType`).

- [ ] **Step 1: Update the `args` validator**

In `createProfile`, replace the `args` block with:

```ts
  args: {
    name: v.string(),
    country: v.string(),
    currencyCode: v.string(),
    currencySymbol: v.string(),
    incomeModel: v.union(
      v.literal("fixed"),
      v.literal("variable"),
      v.literal("mixed"),
    ),
    payFrequency: v.optional(
      v.union(v.literal("monthly"), v.literal("biweekly")),
    ),
    paydays: v.optional(v.array(v.number())),
    allocationNeeds: v.number(),
    allocationWants: v.number(),
    allocationSavings: v.number(),
  },
```

- [ ] **Step 2: Add validation in the handler**

Inside the `handler`, **after** the existing auth check and **before** the idempotency check, add:

```ts
    if (
      (args.incomeModel === "fixed" || args.incomeModel === "mixed") &&
      (!args.payFrequency || !args.paydays || args.paydays.length === 0)
    ) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message:
          "Para ingresos fijos o mixtos, payFrequency y paydays son obligatorios.",
        data: { field: "payFrequency" },
      });
    }
    if (args.incomeModel === "variable" && args.payFrequency) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Para ingresos variables, payFrequency no aplica.",
        data: { field: "payFrequency" },
      });
    }
```

- [ ] **Step 3: Remove `workerType` from the `ctx.db.insert` call**

Replace:

```ts
      workerType: args.workerType,
      payFrequency: args.payFrequency,
      paydays: args.paydays,
```

with:

```ts
      incomeModel: args.incomeModel,
      payFrequency: args.payFrequency,
      paydays: args.paydays,
```

- [ ] **Step 4: Remove the existing `payFrequency`/`paydays` validation (now handled by Step 2)**

Delete the block:

```ts
    if (!isValidPaydays(args.payFrequency, args.paydays)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Los días de pago no son válidos para la frecuencia seleccionada.",
        data: { field: "paydays" },
      });
    }
```

Replace it with a call to `isValidPaydays` that handles the optional case. The simplest correct form is to only validate when present:

```ts
    if (args.payFrequency && args.paydays) {
      if (!isValidPaydays(args.payFrequency, args.paydays)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message:
            "Los días de pago no son válidos para la frecuencia seleccionada.",
          data: { field: "paydays" },
        });
      }
    }
```

- [ ] **Step 5: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors. (Note: `convex/_generated/dataModel.d.ts` has the new `incomeModel` field, so inserts compile fine.)

- [ ] **Step 6: Smoke test**

In `npx convex dashboard`, call `createProfile` with:
- `incomeModel: "fixed"`, no `payFrequency` → expect `VALIDATION_ERROR`.
- `incomeModel: "variable"`, with `payFrequency` → expect `VALIDATION_ERROR`.
- `incomeModel: "fixed"`, with `payFrequency: "monthly"`, `paydays: [1]` → expect success.

- [ ] **Step 7: Commit**

```bash
git add convex/profiles.ts
git commit -m "feat(profiles): use incomeModel in createProfile"
```

---

### Task 17: Migrate `fixedCommitments` mutations to `dueDay`

**Files:**
- Modify: `convex/fixedCommitments.ts`

**Context:** Replace `frequency: "monthly" | "first_payday" | ...` with `dueDay: number` in the args of `createFixedCommitment`. The mutation previously derived `frequency = "monthly"` for monthly profiles; that logic is no longer needed (frequency is gone, `dueDay` is the same for all cycles).

**Interfaces:**
- Consumes: a new arg `dueDay: number` (1-31).
- Produces: a commitment with `dueDay`, no `frequency`.

- [ ] **Step 1: Update the `args` validator of `createFixedCommitment`**

Replace the existing `args` block with:

```ts
  args: {
    name: v.string(),
    amount: v.number(),
    envelope: v.union(v.literal("needs"), v.literal("wants")),
    dueDay: v.number(), // 1-31
  },
```

- [ ] **Step 2: Add validation in the handler**

Right after the auth check and profile lookup, add:

```ts
    if (!Number.isInteger(args.dueDay) || args.dueDay < 1 || args.dueDay > 31) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "dueDay debe ser un entero entre 1 y 31.",
        data: { field: "dueDay" },
      });
    }
```

- [ ] **Step 3: Update the `ctx.db.insert` call**

Replace the existing insert block with:

```ts
    return await ctx.db.insert("fixedCommitments", {
      profileId: profile._id,
      name,
      amount: args.amount,
      envelope: args.envelope,
      dueDay: args.dueDay,
    });
```

- [ ] **Step 4: Migrate the existing `throw new Error` to `ConvexError`**

Replace each `throw new Error("...")` with `throw new ConvexError({ code, message })` using `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR` as appropriate.

- [ ] **Step 5: Add the ConvexError import**

At the top of the file:

```ts
import { ConvexError } from "convex/values";
```

- [ ] **Step 6: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 7: Smoke test**

In `npx convex dashboard`:
- Call `createFixedCommitment` with `dueDay: 0` → expect `VALIDATION_ERROR`.
- Call with `dueDay: 15` → expect success. Verify the new row in Data viewer has `dueDay: 15` and no `frequency`.

- [ ] **Step 8: Commit**

```bash
git add convex/fixedCommitments.ts
git commit -m "feat(commitments): use dueDay instead of frequency"
```

---

### Task 18: Write TDD test for `createIncomeEvent` pure logic

**Files:**
- Create: `convex/lib/incomeEventLogic.test.ts`
- Create: `convex/lib/incomeEventLogic.ts`

**Context:** The new `createIncomeEvent` mutation has two responsibilities we can extract and test purely: (1) resolve which cycle the event belongs to (active, closed-but-matching, or new), and (2) compute `distributionApplied` for the event. We extract them and test them.

**Interfaces:**
- `resolveCycleForEvent({ activeCycle, occurredAt, now })`: returns the resolved `cycleId` (or `null` meaning "create new").
- `computeEventDistribution({ amount, weights })`: returns `{ needs, wants, savings }` in cents (this is `computeAllocations` already, but re-exported under a new name for clarity).

- [ ] **Step 1: Write the failing test for `resolveCycleForEvent`**

Create `convex/lib/incomeEventLogic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveCycleForEvent } from "./incomeEventLogic";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("resolveCycleForEvent", () => {
  const now = new Date("2026-07-15T12:00:00Z").getTime();
  const cycleStart = new Date("2026-07-01T00:00:00Z").getTime();
  const cycleEnd = new Date("2026-07-31T00:00:00Z").getTime();

  it("returns the active cycle when occurredAt is within range", () => {
    const result = resolveCycleForEvent({
      activeCycle: { _id: "active", startDate: cycleStart, endDate: cycleEnd },
      occurredAt: new Date("2026-07-10T00:00:00Z").getTime(),
      now,
    });
    expect(result).toBe("active");
  });

  it("returns null (create new cycle) when no active cycle", () => {
    const result = resolveCycleForEvent({
      activeCycle: null,
      occurredAt: now,
      now,
    });
    expect(result).toBeNull();
  });

  it("returns null when occurredAt is before the active cycle", () => {
    // Event happened last month, no closed cycle in scope: create a new one.
    const result = resolveCycleForEvent({
      activeCycle: { _id: "active", startDate: cycleStart, endDate: cycleEnd },
      occurredAt: new Date("2026-06-15T00:00:00Z").getTime(),
      now,
    });
    expect(result).toBeNull();
  });

  it("returns null when occurredAt is after the active cycle", () => {
    const result = resolveCycleForEvent({
      activeCycle: { _id: "active", startDate: cycleStart, endDate: cycleEnd },
      occurredAt: new Date("2026-08-15T00:00:00Z").getTime(),
      now,
    });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test convex/lib/incomeEventLogic.test.ts`
Expected: FAIL with "Cannot find module './incomeEventLogic'".

- [ ] **Step 3: Implement the helper**

Create `convex/lib/incomeEventLogic.ts`:

```ts
type MinimalCycle = { _id: string; startDate: number; endDate: number };

export function resolveCycleForEvent(input: {
  activeCycle: MinimalCycle | null;
  occurredAt: number;
  now: number;
}): string | null {
  if (!input.activeCycle) return null;
  const { startDate, endDate } = input.activeCycle;
  if (input.occurredAt >= startDate && input.occurredAt < endDate) {
    return input.activeCycle._id;
  }
  return null;
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm test convex/lib/incomeEventLogic.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/lib/incomeEventLogic.ts convex/lib/incomeEventLogic.test.ts
git commit -m "feat(lib): add resolveCycleForEvent helper"
```

---

### Task 19: Write TDD test for `suggestRescueTransfer` (v2.5 coach change)

**Files:**
- Modify: `convex/lib/budgetMath.test.ts` (or new file)
- Modify: `convex/lib/budgetMath.ts`

**Context:** In v2.5 the rescue transfer is a *suggestion*, not an automatic action. The new `suggestRescueTransfer` returns `{ transfer, projectedDeficit }` so the UI can show a confirmation step. We add the function and tests; we keep the old `computeRescueTransfer` for now (used by the existing v2.0 flow) and remove it in a later narrow task.

**Interfaces:**
- `suggestRescueTransfer(savingsRemaining, wantsRemaining): { transfer: number, projectedDeficit: number }`.

- [ ] **Step 1: Append the failing test**

Append to `convex/lib/budgetMath.test.ts`:

```ts
import { suggestRescueTransfer } from "./budgetMath";

describe("suggestRescueTransfer", () => {
  it("returns transfer 0 and projectedDeficit 0 when wants is non-negative", () => {
    const r = suggestRescueTransfer(5000, 1000);
    expect(r).toEqual({ transfer: 0, projectedDeficit: 0 });
  });

  it("suggests transferring the smaller of deficit and savings", () => {
    const r = suggestRescueTransfer(1000, -500);
    expect(r).toEqual({ transfer: 500, projectedDeficit: 500 });
  });

  it("caps transfer at available savings when deficit exceeds savings", () => {
    const r = suggestRescueTransfer(300, -1000);
    expect(r).toEqual({ transfer: 300, projectedDeficit: 1000 });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test convex/lib/budgetMath.test.ts`
Expected: FAIL with "suggestRescueTransfer is not a function".

- [ ] **Step 3: Implement the helper**

Append to `convex/lib/budgetMath.ts`:

```ts
export function suggestRescueTransfer(
  savingsRemaining: number,
  wantsRemaining: number,
): { transfer: number; projectedDeficit: number } {
  const projectedDeficit = wantsRemaining < 0 ? Math.abs(wantsRemaining) : 0;
  const transfer = Math.min(savingsRemaining, projectedDeficit);
  return { transfer, projectedDeficit };
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm test convex/lib/budgetMath.test.ts`
Expected: all tests pass (smoke + suggestRescueTransfer).

- [ ] **Step 5: Commit**

```bash
git add convex/lib/budgetMath.ts convex/lib/budgetMath.test.ts
git commit -m "feat(lib): add suggestRescueTransfer for v2.5 coach"
```

---

### Task 20: Write the new `createIncomeEvent` mutation

**Files:**
- Create: `convex/incomeEvents.ts`

**Context:** This is the v2.5 unified mutation that replaces `processPayday`, `registerAdHocIncome`, and `deleteAdHocIncome`. It handles: resolving the cycle, closing the previous one if needed, computing the distribution, inserting the event, updating envelopes, and updating the cycle's `totalIncomeReceived`.

**Interfaces:**
- `createIncomeEvent({ amount, source, description, occurredAt })`: returns `{ eventId, cycleId }`.
- `deleteIncomeEvent({ eventId })`: reverses the event using its stored `distributionApplied`.

- [ ] **Step 1: Create the file**

Create `convex/incomeEvents.ts`:

```ts
import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import { computeAllocations } from "./lib/budgetMath";
import { resolveCycleForEvent } from "./lib/incomeEventLogic";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CYCLE_DAYS = { biweekly: 15, monthly: 30 } as const;
const HORIZON_DAYS = 15; // v2.5 initial: fixed at 15 for variable income model.

const VALID_SOURCES = [
  "payroll",
  "freelance",
  "business",
  "gift",
  "refund",
  "investment",
  "other",
] as const;
type Source = (typeof VALID_SOURCES)[number];

export const createIncomeEvent = mutation({
  args: {
    amount: v.number(),
    source: v.union(
      v.literal("payroll"),
      v.literal("freelance"),
      v.literal("business"),
      v.literal("gift"),
      v.literal("refund"),
      v.literal("investment"),
      v.literal("other"),
    ),
    description: v.string(),
    occurredAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
    }
    if (!Number.isInteger(args.amount) || args.amount <= 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El monto debe ser un entero de céntimos mayor a cero.",
        data: { field: "amount" },
      });
    }
    const description = args.description.trim();
    if (!description) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "La descripción es obligatoria.",
        data: { field: "description" },
      });
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Perfil no encontrado.",
      });
    }

    const now = Date.now();
    const activeCycle = await ctx.db
      .query("financialCycles")
      .withIndex("by_profile_status", (q) =>
        q.eq("profileId", profile._id).eq("status", "active"),
      )
      .unique();

    // Resolve which cycle the event belongs to.
    const resolvedId = resolveCycleForEvent({
      activeCycle: activeCycle
        ? { _id: activeCycle._id, startDate: activeCycle.startDate, endDate: activeCycle.endDate }
        : null,
      occurredAt: args.occurredAt,
      now,
    });

    let cycleId: string;
    let isNewCycle = false;

    if (resolvedId && activeCycle && resolvedId === activeCycle._id) {
      cycleId = activeCycle._id;
    } else {
      // Close the previous active cycle (if any) and open a new one.
      if (activeCycle) {
        await ctx.db.patch(activeCycle._id, { status: "closed" });
      }
      // Compute the new cycle's window.
      let cycleDays: number;
      if (profile.incomeModel === "variable") {
        cycleDays = HORIZON_DAYS;
      } else {
        // fixed or mixed
        const freq = profile.payFrequency;
        if (!freq) {
          throw new ConvexError({
            code: "VALIDATION_ERROR",
            message:
              "El perfil tiene incomeModel fijo/mixto pero no payFrequency configurado.",
          });
        }
        cycleDays = CYCLE_DAYS[freq];
      }
      const startDate = args.occurredAt;
      const endDate = startDate + cycleDays * MS_PER_DAY;
      cycleId = await ctx.db.insert("financialCycles", {
        profileId: profile._id,
        startDate,
        endDate,
        status: "active",
        totalIncomeReceived: 0,
      });
      isNewCycle = true;
    }

    // Compute distribution with the profile's current allocations.
    const distribution = computeAllocations(args.amount, {
      allocationNeeds: profile.allocationNeeds,
      allocationWants: profile.allocationWants,
      allocationSavings: profile.allocationSavings,
    });

    // Insert the event.
    const eventId = await ctx.db.insert("incomeEvents", {
      profileId: profile._id,
      cycleId: cycleId as Id<"financialCycles">,
      amount: args.amount,
      source: args.source,
      description,
      occurredAt: args.occurredAt,
      distributionApplied: distribution,
    });

    // Update or seed envelopes.
    const envelopes = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) => q.eq("cycleId", cycleId as Id<"financialCycles">))
      .collect();

    if (envelopes.length === 0) {
      // New cycle: seed the 3 envelopes with the distribution.
      await Promise.all([
        ctx.db.insert("envelopes", {
          profileId: profile._id,
          cycleId: cycleId as Id<"financialCycles">,
          type: "needs",
          allocatedAmount: distribution.needs,
          remainingAmount: distribution.needs,
        }),
        ctx.db.insert("envelopes", {
          profileId: profile._id,
          cycleId: cycleId as Id<"financialCycles">,
          type: "wants",
          allocatedAmount: distribution.wants,
          remainingAmount: distribution.wants,
        }),
        ctx.db.insert("envelopes", {
          profileId: profile._id,
          cycleId: cycleId as Id<"financialCycles">,
          type: "savings",
          allocatedAmount: distribution.savings,
          remainingAmount: distribution.savings,
        }),
      ]);
    } else {
      // Existing cycle: patch envelopes with the distribution.
      await Promise.all(
        envelopes.map((env) =>
          ctx.db.patch(env._id, {
            allocatedAmount: env.allocatedAmount + distribution[env.type],
            remainingAmount: env.remainingAmount + distribution[env.type],
          }),
        ),
      );
    }

    // Update the cycle's snapshot.
    const cycle = await ctx.db.get(cycleId as Id<"financialCycles">);
    if (!cycle) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Ciclo no encontrado tras insert.",
      });
    }
    await ctx.db.patch(cycle._id, {
      totalIncomeReceived: (cycle.totalIncomeReceived ?? 0) + args.amount,
    });

    return { eventId, cycleId, isNewCycle };
  },
});
```

- [ ] **Step 2: Verify imports**

The file imports section should be:

```ts
import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { computeAllocations } from "./lib/budgetMath";
import { resolveCycleForEvent } from "./lib/incomeEventLogic";
```

If any of these is missing, add it.

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Smoke test the mutation**

In `npx convex dashboard`:
- Create a profile with `incomeModel: "fixed"`, `payFrequency: "monthly"`, `paydays: [1]`.
- Call `createIncomeEvent` with `amount: 100000`, `source: "payroll"`, `description: "Test payroll"`, `occurredAt: Date.now()`. Verify it returns `{ eventId, cycleId, isNewCycle: true }`. Verify in Data viewer: a new `financialCycles` row, 3 new `envelopes` rows, 1 new `incomeEvents` row.
- Call `createIncomeEvent` again with another amount, same `cycleId`. Verify `isNewCycle: false` and the envelopes' allocated/remaining amounts increased.

- [ ] **Step 5: Commit**

```bash
git add convex/incomeEvents.ts
git commit -m "feat(income): add createIncomeEvent mutation"
```

---

### Task 21: Write the `deleteIncomeEvent` mutation

**Files:**
- Modify: `convex/incomeEvents.ts`

**Context:** Reverses an event by subtracting its stored `distributionApplied` from the envelopes and from the cycle's `totalIncomeReceived`. This is the v2.5 equivalent of `deleteAdHocIncome`.

- [ ] **Step 1: Append the mutation**

Append to `convex/incomeEvents.ts`:

```ts
export const deleteIncomeEvent = mutation({
  args: { eventId: v.id("incomeEvents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión con tu Passkey o credencial.",
      });
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "El ingreso no existe.",
      });
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile || event.profileId !== profile._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "No tienes permisos para eliminar este registro.",
      });
    }

    const cycle = await ctx.db.get(event.cycleId);
    if (!cycle || cycle.status !== "active") {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Solo puedes eliminar ingresos del ciclo activo.",
      });
    }

    // Reverse the distribution on envelopes.
    const envelopes = await ctx.db
      .query("envelopes")
      .withIndex("by_cycle_type", (q) => q.eq("cycleId", cycle._id))
      .collect();
    await Promise.all(
      envelopes.map((env) =>
        ctx.db.patch(env._id, {
          allocatedAmount: env.allocatedAmount - event.distributionApplied[env.type],
          remainingAmount: env.remainingAmount - event.distributionApplied[env.type],
        }),
      ),
    );

    // Reverse the cycle's total.
    await ctx.db.patch(cycle._id, {
      totalIncomeReceived: (cycle.totalIncomeReceived ?? 0) - event.amount,
    });

    await ctx.db.delete(args.eventId);
    return { success: true };
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Smoke test**

In `npx convex dashboard`:
- Get the `eventId` from the previous task's test event.
- Call `deleteIncomeEvent` with it. Verify the envelope amounts decreased. Verify the event row is gone. Verify the cycle's `totalIncomeReceived` decreased.

- [ ] **Step 4: Commit**

```bash
git add convex/incomeEvents.ts
git commit -m "feat(income): add deleteIncomeEvent mutation"
```

---

### Task 22: Update `coachEngine.ts` to use `suggestRescueTransfer`

**Files:**
- Modify: `convex/coachEngine.ts`

**Context:** The v2.5 coach uses the new `suggestRescueTransfer` from `budgetMath.ts` to return a suggestion (not apply a transfer automatically). The flow is: the mutation returns `{ transfer, projectedDeficit }` and the UI presents a confirmation step. The transfer is only applied after the user confirms via a separate mutation.

For this PR, we change the existing `resolveNudgeAction` to **not** apply the transfer automatically. We split the flow into two mutations: `getRescueSuggestion` (reads state, returns suggestion) and `applyRescueTransfer` (only called if the user confirmed). The first is implemented here; the second is out of scope (UI work).

**Interfaces:**
- `getRescueSuggestion({ interactionId })`: returns `{ transfer, projectedDeficit, from, to, cycleId }`. No state change.

- [ ] **Step 1: Update the import**

At the top of `convex/coachEngine.ts`, replace:

```ts
import { computeRescueTransfer } from "./lib/budgetMath";
```

with:

```ts
import { suggestRescueTransfer } from "./lib/budgetMath";
```

- [ ] **Step 2: Refactor `resolveNudgeAction` to NOT apply the transfer**

Replace the existing `if (optionId === "suggest_rescue")` block (and the premium/free branch) with:

```ts
    if (optionId === "suggest_rescue" && profile.plan === "free") {
      await ctx.db.patch(interactionId, {
        selectedOptionId: optionId,
        status: "resolved",
        initialNudge:
          "[Plan Free] El Coach te aconseja: reduce S/ 15 diarios en tus consumos de Gustos por 4 días para equilibrar el sobre sin tocar tus ahorros.",
      });
      return { success: true, mode: "free_advice" as const };
    }

    if (optionId === "suggest_rescue") {
      // v2.5: do NOT apply the transfer automatically. Return the suggestion
      // and let the UI prompt the user for confirmation. The mutation marks
      // the interaction as "resolved" with the suggestion in the nudge; the
      // actual transfer is applied via a separate mutation after confirmation.
      const [savings, wants] = await Promise.all([
        ctx.db
          .query("envelopes")
          .withIndex("by_cycle_type", (q) =>
            q.eq("cycleId", interaction.cycleId).eq("type", "savings"),
          )
          .unique(),
        ctx.db
          .query("envelopes")
          .withIndex("by_cycle_type", (q) =>
            q.eq("cycleId", interaction.cycleId).eq("type", "wants"),
          )
          .unique(),
      ]);

      if (savings && wants) {
        const suggestion = suggestRescueTransfer(
          savings.remainingAmount,
          wants.remainingAmount,
        );
        await ctx.db.patch(interactionId, {
          selectedOptionId: optionId,
          status: "resolved",
          initialNudge: `Te sugiero transferir ${suggestion.transfer} céntimos de Savings a Gustos para cubrir tu déficit proyectado de ${suggestion.projectedDeficit} céntimos. Confirma en la UI para aplicar.`,
        });
      } else {
        await ctx.db.patch(interactionId, {
          selectedOptionId: optionId,
          status: "resolved",
        });
      }
      return { success: true, mode: "suggested" as const };
    }
```

- [ ] **Step 3: Migrate the other `throw new Error` to `ConvexError`**

In `getActiveNudge` and `resolveNudgeAction`, replace each `throw new Error("...")` with `throw new ConvexError({ code, message })` using `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`, `FORBIDDEN` as appropriate.

- [ ] **Step 4: Add the import**

```ts
import { ConvexError } from "convex/values";
```

- [ ] **Step 5: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Smoke test**

In `npx convex dashboard`:
- Set up: a profile with a cycle that has a wants envelope in deficit. Create a `coachInteraction` with `optionId: "suggest_rescue"`.
- Call `resolveNudgeAction` with that option. Verify the interaction is resolved. Verify the `initialNudge` is updated with the suggestion text. Verify the envelopes' amounts are **unchanged** (the transfer is not applied).

- [ ] **Step 7: Commit**

```bash
git add convex/coachEngine.ts
git commit -m "refactor(coach): suggest rescue instead of applying"
```

---

### Task 23: Remove `FREE_PLAN_MONTHLY_LIMIT` from `expenses.ts`

**Files:**
- Modify: `convex/expenses.ts`

**Context:** In v2.5, plan Free is unlimited. Premium adds automation, not more registrations. The block of code that throws on the 20th expense is removed entirely.

- [ ] **Step 1: Delete the constant and the block**

In `convex/expenses.ts`:
- Delete the line `const FREE_PLAN_MONTHLY_LIMIT = 20;`.
- Delete the entire `if (profile.plan === "free") { ... }` block inside `registerExpense` (the one with `counted`, `counted.length >= FREE_PLAN_MONTHLY_LIMIT`, and the throw).

- [ ] **Step 2: Migrate the remaining `throw new Error` to `ConvexError`**

In `registerExpense`, `getRecentExpenses`, and `deleteExpense`, replace each `throw new Error("...")` with `throw new ConvexError({ code, message })` using `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`, `FORBIDDEN` as appropriate.

- [ ] **Step 3: Add the import**

```ts
import { ConvexError } from "convex/values";
```

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Smoke test**

In `npx convex dashboard`:
- Register 25 expenses against the same cycle. Verify all 25 succeed. Verify no error about plan limit.

- [ ] **Step 6: Commit**

```bash
git add convex/expenses.ts
git commit -m "feat(expenses): remove FREE_PLAN_MONTHLY_LIMIT"
```

---

### Task 24: Remove `processPayday` and `registerAdHocIncome` from `paydayEngine.ts`

**Files:**
- Modify: `convex/paydayEngine.ts`

**Context:** These mutations are replaced by `createIncomeEvent` (Task 20). Delete them. Leave `deleteAdHocIncome` for now (still needed to clean up the old `adHocIncomes` table; we drop the table in Task 26).

- [ ] **Step 1: Delete `processPayday` and `registerAdHocIncome`**

Open `convex/paydayEngine.ts`. Delete the `processPayday` mutation (lines 14-160 in the current file) and the `registerAdHocIncome` mutation (lines 166-246). Leave `deleteAdHocIncome` intact.

- [ ] **Step 2: Verify imports are still used**

If the remaining `deleteAdHocIncome` no longer uses the imports from `convex/lib/budgetMath`, remove them. The file should now have only:
- `ConvexError` import from `convex/values`.
- `mutation` from `./_generated/server`.
- The `deleteAdHocIncome` mutation.

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add convex/paydayEngine.ts
git commit -m "refactor(payday): remove processPayday and registerAdHocIncome"
```

---

### Task 25: Update `paydayEngine.ts` `deleteAdHocIncome` to use `ConvexError`

**Files:**
- Modify: `convex/paydayEngine.ts`

**Context:** While we still have `deleteAdHocIncome` (to clean up old data), we migrate its errors to `ConvexError`. This is mechanical.

- [ ] **Step 1: Add the import**

At the top of the file, ensure:

```ts
import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
```

- [ ] **Step 2: Replace each `throw new Error("...")` with `ConvexError`**

For each throw, use:
- `UNAUTHORIZED` for auth failures.
- `NOT_FOUND` for "el ingreso no existe".
- `FORBIDDEN` for "no tienes permisos".
- `VALIDATION_ERROR` for "solo puedes eliminar ingresos del ciclo activo".

- [ ] **Step 3: Typecheck and smoke test**

Run: `pnpm tsc --noEmit`. Expected: 0 errors. In `npx convex dashboard`, attempt to delete a non-existent `adHocIncome` and verify the error has a `code` field.

- [ ] **Step 4: Commit**

```bash
git add convex/paydayEngine.ts
git commit -m "refactor(payday): migrate deleteAdHocIncome to ConvexError"
```

---

### Task 26: Remove `adHocIncomes` table and old `financialCycles` fields

**Files:**
- Modify: `convex/schema.ts`

**Context:** This is the final narrow step. We delete `adHocIncomes` (along with the `migratedToIncomeEvents` flag we added in Task 12). We delete `baseIncomeReceived`, `extraordinaryIncomeReceived`, `totalPeriodIncome` from `financialCycles`. We delete `workerType` from `profiles`. We delete `frequency` from `fixedCommitments`. We make all the v2.5 fields **required** (no longer `v.optional`).

**Important:** This task MUST be run after a full smoke test of the app, because it's the irreversible step. If you have any doubt, back out and re-test.

- [ ] **Step 1: Run `pnpm tsc --noEmit` first to confirm the project compiles**

If there are errors, do not proceed. Fix them first.

- [ ] **Step 2: Edit `profiles` table**

In `convex/schema.ts`, in the `profiles` table:
- Remove the `workerType` line.
- Change `incomeModel: v.optional(...)` to `incomeModel: v.union(...)` (required).
- Change `payFrequency: v.optional(...)` to (unchanged) `payFrequency: v.optional(...)` — keep it optional because `variable` users don't have it.
- Same for `paydays`.
- Remove the comment "v2.5: how the user organizes their income cycle (replaces workerType)" — the field is now self-explanatory.

- [ ] **Step 3: Edit `financialCycles` table**

- Remove `baseIncomeReceived`, `extraordinaryIncomeReceived`, `totalPeriodIncome`.
- Change `totalIncomeReceived: v.optional(v.number())` to `totalIncomeReceived: v.number()` (required).
- Remove the v2.5 comment on `totalIncomeReceived`.

- [ ] **Step 4: Edit `fixedCommitments` table**

- Remove the `frequency` field entirely.
- Change `dueDay: v.optional(v.number())` to `dueDay: v.number()` (required).
- Remove the v2.5 comment on `dueDay`.

- [ ] **Step 5: Remove the `adHocIncomes` table**

Delete the entire `adHocIncomes` table definition.

- [ ] **Step 6: Update `convex/paydayEngine.ts` to remove `deleteAdHocIncome`**

`deleteAdHocIncome` references the now-deleted `adHocIncomes` table. Delete the `deleteAdHocIncome` mutation. The whole `convex/paydayEngine.ts` file can be **deleted** (it now has no content).

```bash
rm convex/paydayEngine.ts
```

- [ ] **Step 7: Regenerate types and typecheck**

Run: `npx convex dev`
Then: `pnpm tsc --noEmit`
Expected: 0 errors. If there are errors, the most likely cause is something referencing `workerType`, `baseIncomeReceived`, `extraordinaryIncomeReceived`, `totalPeriodIncome`, or `frequency` that we missed. Grep for them:

```bash
grep -rn "workerType\|baseIncomeReceived\|extraordinaryIncomeReceived\|totalPeriodIncome\|adHocIncomes" --include="*.ts" --include="*.tsx" convex/ modules/ app/ shared/ core/ auth/
```

Fix any remaining references.

- [ ] **Step 8: Smoke test (partial, expected to fail onboarding)**

`pnpm dev`. Sign in with a **pre-existing** user. Run through:
- Login with passkey → expect success.
- Dashboard for a pre-existing user → expect success (envelopes, ciclo, etc. se leen con el código nuevo).
- Register an expense → expect success.
- Resolve a coach interaction → expect success.
- **DO NOT** try to complete onboarding with a new user. It is **expected to fail** because the onboarding code still uses `workerType` and the old `createProfile` signature. This PR is the schema/backend migration; the onboarding v2.5 is a follow-up PR.

The PR description must include this banner:

> **⚠️ Onboarding is intentionally broken in this PR.** The new schema does not include `workerType`, but the onboarding flow at `app/(onboarding)/configurar/` still uses it. A follow-up PR will rewrite the onboarding to consume the v2.5 API. This PR is the schema/backend migration only and should be merged into a feature branch, not directly into `main`, until the onboarding follow-up is ready.

- [ ] **Step 9: Commit**

```bash
git add convex/schema.ts convex/_generated/ convex/paydayEngine.ts
git commit -m "feat(schema): remove v2.0 fields and adHocIncomes (narrow)"
```

---

## Phase 4: Verify

### Task 27: Full test run

**Files:** none

- [ ] **Step 1: Run all unit tests**

Run: `pnpm test`
Expected: all tests pass (smoke + backfillIncomeModel + backfillCommitmentDueDay + resolveCycleForEvent + suggestRescueTransfer).

- [ ] **Step 2: Run typecheck**

Run: `pnpm tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Run linter**

Run: `pnpm lint`
Expected: no new errors.

- [ ] **Step 4: Run formatter**

Run: `pnpm format`
Expected: any formatting issues resolved.

- [ ] **Step 5: Final git status check**

Run: `git status`
Expected: clean working tree (or only uncommitted edits from `pnpm format`).

---

### Task 28: Write the PR description

**Files:** none

- [ ] **Step 1: Open a PR with this checklist**

```markdown
## Domain v2.5 migration

Closes the v2.5 audit spec (`docs/superpowers/specs/2026-07-07-domain-v25-audit-design.md`).

### Phase 1 (Widen)
- [x] `profiles.incomeModel` added (now required)
- [x] `profiles.payFrequency` and `profiles.paydays` now optional
- [x] `financialCycles.totalIncomeReceived` added (now required, replaces the base/extraordinary/totalPeriodIncome trio)
- [x] `incomeEvents` table added
- [x] `fixedCommitments.dueDay` added (now required, replaces `frequency`)
- [x] Index `by_profile_dueDay` on `fixedCommitments`

### Phase 2 (Migrate)
- [x] 4 backfill mutations created in `convex/migrations.ts`:
  - `backfillProfilesV25`
  - `backfillCyclesV25`
  - `backfillCommitmentsV25`
  - `backfillIncomeEventsV25`
- [x] Runbook at `docs/migrations/2026-07-07-v25-migration.md`

### Phase 3 (Narrow)
- [x] `createProfile` accepts `incomeModel` instead of `workerType`
- [x] `createFixedCommitment` accepts `dueDay` instead of `frequency`
- [x] New `createIncomeEvent` and `deleteIncomeEvent` mutations in `convex/incomeEvents.ts`
- [x] `processPayday` and `registerAdHocIncome` removed
- [x] `deleteAdHocIncome` removed (table no longer exists)
- [x] `paydayEngine.ts` deleted
- [x] `suggestRescueTransfer` replaces `computeRescueTransfer` in `coachEngine.ts`
- [x] `FREE_PLAN_MONTHLY_LIMIT` removed from `expenses.ts`
- [x] All mutations throw `ConvexError({ code, message })` with `ErrorCode`

### Follow-ups (out of scope)
- [ ] Onboarding v2.5 wizard (separate spec) — **blocks merge to `main`**
- [ ] Dashboard v2.5 with new "Disponibilidad del ciclo" UI
- [ ] Cascade engine for `variable` income model (commitment coverage on event)
- [ ] Setting to allow user to adjust `dueDay` per commitment

### Merge policy
- **DO NOT merge to `main`** until the Onboarding v2.5 follow-up PR is ready and merged. This PR's smoke test is intentionally partial (onboarding is broken).
- Merge into a feature branch and hold there.

### Known limitations
- Migrated `adHocIncomes` rows are indistinguishable from real `other` source events.
- Commitments with `every_payday` lose to first-payday only. Users should review after deploy.
```

---

## Total tasks: 28

Estimated implementation time (with subagent execution): ~6-8 hours of compute, with multiple checkpoints for review.

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-07-domain-v25-migration.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
