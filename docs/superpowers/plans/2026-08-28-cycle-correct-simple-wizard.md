# Wizard simple de corrección de ciclo (/cycle/correct) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el formulario técnico de `/cycle/correct` por un wizard de 3 pasos (ingreso real → dinero con dueño → repartir lo libre) que produce el mismo `CycleCorrectionPlan` actual.

**Architecture:** Lógica pura nueva en `modules/cycle-correction/lib/` (TDD) que convierte "ingreso − reservado" en `CycleCorrectionPlan`. UI nueva con 3 componentes de paso + contenedor. Backend Convex **sin cambios**. El formulario técnico actual se elimina junto con sus libs si quedan huérfanas.

**Tech Stack:** Next.js 16 App Router, Convex (`api.cycleCorrection.correctActiveCycleAllocation`, `api.fixedCommitments.createFixedCommitment`, `api.dashboard.getSummary`, `api.settings.getSettingsOverview`), zod, Vitest + Testing Library, Tailwind v4 con tokens del canon (`bg-card`, `border-line`, `text-mute`, `bg-qp`…).

## Global Constraints

- Validaciones de inputs del wizard con **zod** (`safeParse`, mensajes en español, sin jerga técnica).
- **Cero cambios en `convex/`** (ni schema ni mutaciones).
- Sin comentarios en el código (estándar del repo §6.1).
- Copy en español del canon (§3.8): sobrio, sin emojis, sin jerga contable.
- Los eventos de analítica existentes `ALLOCATION_CORRECT_STARTED` / `ALLOCATION_CORRECT_COMPLETED` se conservan.
- Moneda: montos internos en **céntimos enteros**; parse con `parseToCents` (`shared/lib/money`), formato con `formatCents(cents, { currency })`.
- `pnpm vitest run` verde + `pnpm lint` + `pnpm build:next` (o typecheck) antes de cada PR.

### Contexto para el ejecutor (cómo funciona lo existente)

- `correctActiveCycleAllocation` recibe: `setEnvelopeRemaining: {needs,wants,savings}` (saldos restantes a fijar), `setUnallocatedCents`, `reserveToCommitments: [{commitmentId, amountCents}]`, `note`. Opcionalmente `declaredLiquidCents` (el wizard **no** lo manda) y `contributeToSavings` / `annulInferredSavingsCents` (fuera de este flujo).
- `api.dashboard.getSummary` devuelve `{ profile: {currencyCode,…}, cycle: {id, unallocatedCents, needsReview,…}, envelopes: [{type:"needs"|"wants"|"savings", allocatedAmount, remainingAmount}], commitments: [{id,name,amount,…}], liquidity: {reservedCents,…} }`.
- El % de asignación del perfil viene de `api.settings.getSettingsOverview` → `allocations: { needs, wants, savings }` (porcentajes que suman 100).
- Compromiso rápido: `api.fixedCommitments.createFixedCommitment({ name, amount, envelope: "needs"|"wants", dueDay: 1..31 })` → devuelve `Id<"fixedCommitments">`. `amount` es céntimos.
- UI primitives en `shared/components/ui/`: `Button`, `Input`, `Label`, `Dialog/Sheet`. Pattern de wizard existente: `modules/settings/components/cycle-change-wizard.tsx` (referencia de estilo, no copiar tal cual).
- Test setup: Vitest + jsdom + Testing Library (ver `modules/movements/components/__tests__/` para el patrón de render).

---

### Task 1: Lógica pura — propuesta de reparto y plan de corrección

**Files:**
- Create: `modules/cycle-correction/lib/simple-correction-plan.ts`
- Test: `modules/cycle-correction/lib/__tests__/simple-correction-plan.test.ts`

**Interfaces:**
- Consumes: nada (puro).
- Produces: `Allocation`, `EnvelopeTargets`, `SimpleCorrectionInput`, `SimpleCorrectionResult`, `proposeRemainingByEnvelope(input): EnvelopeTargets`, `buildSimpleCorrectionPlan(input): SimpleCorrectionResult`. Tasks 3–4 consumen estas firmas exactas.

- [ ] **Step 1: Write the failing test**

```ts
// modules/cycle-correction/lib/__tests__/simple-correction-plan.test.ts
import { describe, expect, it } from "vitest";
import {
  buildSimpleCorrectionPlan,
  proposeRemainingByEnvelope,
} from "../simple-correction-plan";

const ALLOCATION = { needs: 50, wants: 30, savings: 20 };

describe("proposeRemainingByEnvelope", () => {
  it("reparte el libre según los porcentajes", () => {
    expect(
      proposeRemainingByEnvelope({
        freeCents: 130_000,
        allocation: ALLOCATION,
        spentPerEnvelope: { needs: 0, wants: 0, savings: 0 },
      }),
    ).toEqual({ needs: 65_000, wants: 39_000, savings: 26_000 });
  });

  it("resta lo ya gastado y no baja de 0", () => {
    expect(
      proposeRemainingByEnvelope({
        freeCents: 130_000,
        allocation: ALLOCATION,
        spentPerEnvelope: { needs: 70_000, wants: 10_000, savings: 0 },
      }),
    ).toEqual({ needs: 0, wants: 29_000, savings: 26_000 });
  });

  it("con libre 0 todo queda en 0", () => {
    expect(
      proposeRemainingByEnvelope({
        freeCents: 0,
        allocation: ALLOCATION,
        spentPerEnvelope: { needs: 0, wants: 0, savings: 0 },
      }),
    ).toEqual({ needs: 0, wants: 0, savings: 0 });
  });
});

describe("buildSimpleCorrectionPlan", () => {
  const base = {
    incomeCents: 380_000,
    allocation: ALLOCATION,
    spentPerEnvelope: { needs: 0, wants: 0, savings: 0 },
    targets: { needs: 65_000, wants: 39_000, savings: 26_000 },
  };

  it("reserva a compromiso y deja el resto sin asignar en 0", () => {
    const result = buildSimpleCorrectionPlan({
      ...base,
      reservedWithCommitmentCents: 250_000,
      reservedGenericCents: 0,
      commitmentId: "c1",
    });
    expect(result.reserveToCommitments).toEqual([
      { commitmentId: "c1", amountCents: 250_000 },
    ]);
    expect(result.remainingByEnvelope).toEqual(base.targets);
    expect(result.unallocatedCents).toBe(0);
  });

  it("apartar sin compromiso va a por repartir", () => {
    const result = buildSimpleCorrectionPlan({
      ...base,
      reservedWithCommitmentCents: 0,
      reservedGenericCents: 250_000,
      commitmentId: null,
    });
    expect(result.reserveToCommitments).toEqual([]);
    expect(result.unallocatedCents).toBe(250_000);
  });

  it("el sobrante del reparto va a por repartir", () => {
    const result = buildSimpleCorrectionPlan({
      ...base,
      reservedWithCommitmentCents: 250_000,
      reservedGenericCents: 0,
      commitmentId: "c1",
      targets: { needs: 50_000, wants: 30_000, savings: 20_000 },
    });
    expect(result.unallocatedCents).toBe(30_000);
  });

  it("lanza si los objetivos superan el libre", () => {
    expect(() =>
      buildSimpleCorrectionPlan({
        ...base,
        reservedWithCommitmentCents: 250_000,
        reservedGenericCents: 0,
        commitmentId: "c1",
        targets: { needs: 200_000, wants: 0, savings: 0 },
      }),
    ).toThrow("Los sobres no pueden superar el dinero libre");
  });

  it("lanza si reservado supera el ingreso", () => {
    expect(() =>
      buildSimpleCorrectionPlan({
        ...base,
        reservedWithCommitmentCents: 400_000,
        reservedGenericCents: 0,
        commitmentId: "c1",
      }),
    ).toThrow("Lo apartado no puede superar lo ingresado");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run modules/cycle-correction/lib/__tests__/simple-correction-plan.test.ts`
Expected: FAIL (no existe `../simple-correction-plan`).

- [ ] **Step 3: Write minimal implementation**

```ts
// modules/cycle-correction/lib/simple-correction-plan.ts
export type Allocation = { needs: number; wants: number; savings: number };

export type EnvelopeTargets = { needs: number; wants: number; savings: number };

export type SimpleCorrectionInput = {
  incomeCents: number;
  reservedWithCommitmentCents: number;
  reservedGenericCents: number;
  commitmentId: string | null;
  allocation: Allocation;
  spentPerEnvelope: EnvelopeTargets;
  targets: EnvelopeTargets;
};

export type SimpleCorrectionResult = {
  remainingByEnvelope: EnvelopeTargets;
  unallocatedCents: number;
  reserveToCommitments: Array<{ commitmentId: string; amountCents: number }>;
};

export function computeFreeCents(
  input: Pick<
    SimpleCorrectionInput,
    "incomeCents" | "reservedWithCommitmentCents" | "reservedGenericCents"
  >,
): number {
  return (
    input.incomeCents -
    input.reservedWithCommitmentCents -
    input.reservedGenericCents
  );
}

export function proposeRemainingByEnvelope(input: {
  freeCents: number;
  allocation: Allocation;
  spentPerEnvelope: EnvelopeTargets;
}): EnvelopeTargets {
  const out = { needs: 0, wants: 0, savings: 0 };
  for (const key of ["needs", "wants", "savings"] as const) {
    const share = Math.floor((input.freeCents * input.allocation[key]) / 100);
    out[key] = Math.max(0, share - input.spentPerEnvelope[key]);
  }
  return out;
}

export function buildSimpleCorrectionPlan(
  input: SimpleCorrectionInput,
): SimpleCorrectionResult {
  if (
    input.reservedWithCommitmentCents + input.reservedGenericCents >
    input.incomeCents
  ) {
    throw new Error("Lo apartado no puede superar lo ingresado");
  }
  const freeCents = computeFreeCents(input);
  const totalTargets =
    input.targets.needs + input.targets.wants + input.targets.savings;
  if (totalTargets > freeCents) {
    throw new Error("Los sobres no pueden superar el dinero libre");
  }
  return {
    remainingByEnvelope: { ...input.targets },
    unallocatedCents: input.reservedGenericCents + (freeCents - totalTargets),
    reserveToCommitments:
      input.reservedWithCommitmentCents > 0 && input.commitmentId
        ? [
            {
              commitmentId: input.commitmentId,
              amountCents: input.reservedWithCommitmentCents,
            },
          ]
        : [],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run modules/cycle-correction/lib/__tests__/simple-correction-plan.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/cycle-correction/lib/simple-correction-plan.ts modules/cycle-correction/lib/__tests__/simple-correction-plan.test.ts
git commit -m "feat(cycle-correct): logica pura de wizard de correccion"
```

---

### Task 2: Validación con zod del wizard

**Files:**
- Create: `modules/cycle-correction/lib/simple-correction-schema.ts`
- Test: `modules/cycle-correction/lib/__tests__/simple-correction-schema.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `simpleCorrectionWizardSchema` (z.ZodObject con refinements) y tipo inferido `SimpleCorrectionWizardValues`. El contenedor (Task 4) usa `safeParse` antes de `buildSimpleCorrectionPlan`.

- [ ] **Step 1: Write the failing test**

```ts
// modules/cycle-correction/lib/__tests__/simple-correction-schema.test.ts
import { describe, expect, it } from "vitest";
import { simpleCorrectionWizardSchema } from "../simple-correction-schema";

const valid = {
  incomeCents: 380_000,
  reservedMode: "existing" as const,
  reservedCents: 250_000,
  commitmentId: "c1",
  newCommitment: undefined,
  targets: { needs: 65_000, wants: 39_000, savings: 26_000 },
};

describe("simpleCorrectionWizardSchema", () => {
  it("acepta un wizard completo", () => {
    expect(
      simpleCorrectionWizardSchema.safeParse(valid).success,
    ).toBe(true);
  });

  it("rechaza ingreso <= 0", () => {
    expect(
      simpleCorrectionWizardSchema.safeParse({ ...valid, incomeCents: 0 })
        .success,
    ).toBe(false);
  });

  it("rechaza reservado mayor al ingreso", () => {
    expect(
      simpleCorrectionWizardSchema.safeParse({
        ...valid,
        reservedCents: 400_000,
      }).success,
    ).toBe(false);
  });

  it("exige compromiso si el modo es existing", () => {
    expect(
      simpleCorrectionWizardSchema.safeParse({ ...valid, commitmentId: "" })
        .success,
    ).toBe(false);
  });

  it("exige datos del nuevo compromiso si el modo es create", () => {
    expect(
      simpleCorrectionWizardSchema.safeParse({
        ...valid,
        reservedMode: "create",
        commitmentId: undefined,
        newCommitment: undefined,
      }).success,
    ).toBe(false);
    expect(
      simpleCorrectionWizardSchema.safeParse({
        ...valid,
        reservedMode: "create",
        commitmentId: undefined,
        newCommitment: {
          name: "Cuota auto",
          amountCents: 250_000,
          dueDay: 15,
          envelope: "needs" as const,
        },
      }).success,
    ).toBe(true);
  });

  it("rechaza targets negativos o no enteros", () => {
    expect(
      simpleCorrectionWizardSchema.safeParse({
        ...valid,
        targets: { needs: -1, wants: 0, savings: 0 },
      }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run modules/cycle-correction/lib/__tests__/simple-correction-schema.test.ts`
Expected: FAIL (no existe el schema).

- [ ] **Step 3: Write minimal implementation**

```ts
// modules/cycle-correction/lib/simple-correction-schema.ts
import { z } from "zod";

export const simpleCorrectionWizardSchema = z
  .object({
    incomeCents: z
      .number()
      .int()
      .positive("El ingreso debe ser mayor a 0."),
    reservedMode: z.enum(["existing", "create", "generic"]),
    reservedCents: z.number().int().nonnegative(),
    commitmentId: z.string().optional(),
    newCommitment: z
      .object({
        name: z.string().trim().min(1, "Ponle un nombre al compromiso."),
        amountCents: z.number().int().positive(),
        dueDay: z.number().int().min(1).max(31),
        envelope: z.enum(["needs", "wants"]),
      })
      .optional(),
    targets: z.object({
      needs: z.number().int().nonnegative(),
      wants: z.number().int().nonnegative(),
      savings: z.number().int().nonnegative(),
    }),
  })
  .refine((data) => data.reservedCents <= data.incomeCents, {
    message: "Lo apartado no puede superar lo ingresado.",
    path: ["reservedCents"],
  })
  .refine(
    (data) => data.reservedMode !== "existing" || Boolean(data.commitmentId),
    { message: "Elige el compromiso para tu reserva.", path: ["commitmentId"] },
  )
  .refine(
    (data) => data.reservedMode !== "create" || data.newCommitment != null,
    {
      message: "Completa los datos del nuevo compromiso.",
      path: ["newCommitment"],
    },
  );

export type SimpleCorrectionWizardValues = z.infer<
  typeof simpleCorrectionWizardSchema
>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run modules/cycle-correction/lib/__tests__/simple-correction-schema.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/cycle-correction/lib/simple-correction-schema.ts modules/cycle-correction/lib/__tests__/simple-correction-schema.test.ts
git commit -m "feat(cycle-correct): schema zod del wizard de correccion"
```

---

### Task 3: Componentes de los 3 pasos (presentacionales)

**Files:**
- Create: `modules/cycle-correction/components/wizard-step-income.tsx`
- Create: `modules/cycle-correction/components/wizard-step-reserved.tsx`
- Create: `modules/cycle-correction/components/wizard-step-split.tsx`
- Test: `modules/cycle-correction/components/__tests__/wizard-steps.test.tsx`

**Interfaces:**
- Consumes: `shared/components/ui/{button,input,label}`, `formatCents` de `shared/lib/money`.
- Produces: props-driven components (siguientes firmas). El contenedor (Task 4) los renderiza.

- [ ] **Step 1: Write the failing test**

```tsx
// modules/cycle-correction/components/__tests__/wizard-steps.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WizardStepIncome } from "../wizard-step-income";
import { WizardStepReserved } from "../wizard-step-reserved";
import { WizardStepSplit } from "../wizard-step-split";

describe("WizardStepIncome", () => {
  it("edita el monto y avanza", () => {
    const onAmountChange = vi.fn();
    const onNext = vi.fn();
    render(
      <WizardStepIncome
        amountText="3800"
        currencyCode="PEN"
        onAmountChange={onAmountChange}
        onNext={onNext}
      />,
    );
    fireEvent.change(screen.getByLabelText(/ingresó|entró/i), {
      target: { value: "3800" },
    });
    expect(onAmountChange).toHaveBeenCalledWith("3800");
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
    ).toBeInTheDocument();
  });

  it("deshabilita continuar sin compromiso en modo existing", () => {
    render(
      <WizardStepReserved
        incomeCents={380_000}
        reservedText="2500"
        reservedMode="existing"
        commitmentId=""
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
    expect(screen.getByText(/te quedan/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run modules/cycle-correction/components/__tests__/wizard-steps.test.tsx`
Expected: FAIL (no existen los componentes).

- [ ] **Step 3: Write minimal implementation**

```tsx
// modules/cycle-correction/components/wizard-step-income.tsx
"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { parseToCents } from "@/shared/lib/money";

type Props = {
  amountText: string;
  currencyCode: string;
  onAmountChange: (value: string) => void;
  onNext: () => void;
};

export function WizardStepIncome({
  amountText,
  currencyCode,
  onAmountChange,
  onNext,
}: Props) {
  const cents = parseToCents(amountText);
  const valid = cents != null && cents > 0;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl text-ink">
          ¿Cuánto dinero entró realmente este ciclo?
        </h2>
        <p className="mt-1 text-sm text-mute">
          El monto total que recibiste, sin restar nada.
        </p>
      </div>
      <Input
        aria-label="Ingreso real del ciclo"
        className="h-14 text-center font-serif text-2xl"
        inputMode="decimal"
        placeholder="0.00"
        value={amountText}
        onChange={(event) => onAmountChange(event.target.value)}
      />
      <p className="text-[12px] text-mute">Moneda: {currencyCode}</p>
      <Button className="w-full" disabled={!valid} onClick={onNext}>
        Continuar
      </Button>
    </div>
  );
}
```

```tsx
// modules/cycle-correction/components/wizard-step-reserved.tsx
"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { formatCents, parseToCents } from "@/shared/lib/money";
import type { SimpleCorrectionWizardValues } from "../lib/simple-correction-schema";

type NewCommitment = NonNullable<SimpleCorrectionWizardValues["newCommitment"]>;

type Props = {
  incomeCents: number;
  reservedText: string;
  reservedMode: SimpleCorrectionWizardValues["reservedMode"];
  commitmentId: string;
  newCommitment: NewCommitment;
  commitments: Array<{ id: string; name: string; amount: number }>;
  currencyCode: string;
  onReservedChange: (value: string) => void;
  onModeChange: (mode: SimpleCorrectionWizardValues["reservedMode"]) => void;
  onCommitmentChange: (id: string) => void;
  onNewCommitmentChange: (value: NewCommitment) => void;
  onBack: () => void;
  onNext: () => void;
};

const MODE_OPTIONS = [
  { mode: "existing" as const, label: "De un compromiso que ya tengo" },
  { mode: "create" as const, label: "Crear un compromiso nuevo" },
  { mode: "generic" as const, label: "Solo apartarlo, sin compromiso" },
];

export function WizardStepReserved(props: Props) {
  const reservedCents = parseToCents(props.reservedText) ?? 0;
  const exceeds = reservedCents > props.incomeCents;
  const missingCommitment =
    props.reservedMode === "existing" && !props.commitmentId;
  const newCommitmentInvalid =
    props.reservedMode === "create" &&
    (!props.newCommitment.name.trim() ||
      props.newCommitment.amountCents <= 0 ||
      props.newCommitment.dueDay < 1 ||
      props.newCommitment.dueDay > 31);
  const canContinue =
    !exceeds && !missingCommitment && !newCommitmentInvalid;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl text-ink">
          ¿Cuánto ya tiene dueño?
        </h2>
        <p className="mt-1 text-sm text-mute">
          Dinero que debes separar para compromisos fijos, como cuotas o
          deudas.
        </p>
      </div>
      <div>
        <Label htmlFor="wizard-reserved-amount">Monto apartado</Label>
        <Input
          id="wizard-reserved-amount"
          className="mt-1.5 h-12 text-center font-serif text-xl"
          inputMode="decimal"
          placeholder="0.00"
          value={props.reservedText}
          onChange={(event) => props.onReservedChange(event.target.value)}
        />
        {exceeds ? (
          <p className="mt-1 text-[12px] text-danger-ink">
            Lo apartado no puede superar lo ingresado (
            {formatCents(props.incomeCents, { currency: props.currencyCode })}).
          </p>
        ) : null}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-[13px] text-mute">
          ¿A qué se destina?
        </legend>
        {MODE_OPTIONS.map((option) => (
          <label
            key={option.mode}
            className={`flex cursor-pointer items-center gap-2 rounded-[14px] border p-3 text-sm ${
              props.reservedMode === option.mode
                ? "border-qp bg-qp-panel"
                : "border-line bg-card"
            }`}
          >
            <input
              type="radio"
              name="wizard-reserved-mode"
              className="accent-[var(--qp)]"
              checked={props.reservedMode === option.mode}
              onChange={() => props.onModeChange(option.mode)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {props.reservedMode === "existing" ? (
        <div>
          <Label htmlFor="wizard-reserved-commitment">Compromiso</Label>
          <select
            id="wizard-reserved-commitment"
            className="mt-1.5 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm"
            value={props.commitmentId}
            onChange={(event) =>
              props.onCommitmentChange(event.target.value)
            }
          >
            <option value="">Elige un compromiso…</option>
            {props.commitments.map((commitment) => (
              <option key={commitment.id} value={commitment.id}>
                {commitment.name} ·{" "}
                {formatCents(commitment.amount, {
                  currency: props.currencyCode,
                })}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {props.reservedMode === "create" ? (
        <div className="space-y-2">
          <div>
            <Label htmlFor="wizard-new-name">Nombre</Label>
            <Input
              id="wizard-new-name"
              className="mt-1.5"
              placeholder="Cuota auto"
              value={props.newCommitment.name}
              onChange={(event) =>
                props.onNewCommitmentChange({
                  ...props.newCommitment,
                  name: event.target.value,
                })
              }
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="wizard-new-amount">Cuota</Label>
              <Input
                id="wizard-new-amount"
                className="mt-1.5"
                inputMode="decimal"
                placeholder="0.00"
                value={props.reservedText}
                readOnly
              />
            </div>
            <div className="w-24">
              <Label htmlFor="wizard-new-dueday">Día de pago</Label>
              <Input
                id="wizard-new-dueday"
                className="mt-1.5"
                inputMode="numeric"
                value={props.newCommitment.dueDay || ""}
                onChange={(event) =>
                  props.onNewCommitmentChange({
                    ...props.newCommitment,
                    dueDay: Number(event.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={props.onBack}>
          Atrás
        </Button>
        <Button
          className="flex-1"
          disabled={!canContinue}
          onClick={props.onNext}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
```

```tsx
// modules/cycle-correction/components/wizard-step-split.tsx
"use client";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { formatCents } from "@/shared/lib/money";
import { ENVELOPE_LABELS } from "@/shared/constants/envelopes";
import type { EnvelopeTargets } from "../lib/simple-correction-plan";

type Props = {
  freeCents: number;
  targets: EnvelopeTargets;
  currencyCode: string;
  overrunWarning: string | null;
  onTargetChange: (key: keyof EnvelopeTargets, cents: number) => void;
  onResetProposal: () => void;
  onBack: () => void;
  onSubmit: () => void;
};

const STEP_CENTS = 10_000;

export function WizardStepSplit(props: Props) {
  const assigned =
    props.targets.needs + props.targets.wants + props.targets.savings;
  const left = Math.max(0, props.freeCents - assigned);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl text-ink">Reparte lo libre</h2>
        <p className="mt-1 text-sm text-mute">
          Te quedan{" "}
          <span className="font-medium text-ink">
            {formatCents(left, { currency: props.currencyCode })}
          </span>{" "}
          por repartir.
        </p>
      </div>
      {props.overrunWarning ? (
        <p className="text-[12px] text-warning-ink">{props.overrunWarning}</p>
      ) : null}
      <div className="space-y-3">
        {(["needs", "wants", "savings"] as const).map((key) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-[14px] border border-line bg-card p-3"
          >
            <Label className="text-[13px]">{ENVELOPE_LABELS[key]}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0"
                aria-label="−"
                onClick={() =>
                  props.onTargetChange(
                    key,
                    Math.max(0, props.targets[key] - STEP_CENTS),
                  )
                }
              >
                −
              </Button>
              <span className="w-24 text-center text-sm font-medium tabular-nums">
                {formatCents(props.targets[key], {
                  currency: props.currencyCode,
                })}
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0"
                aria-label="+"
                onClick={() =>
                  props.onTargetChange(key, props.targets[key] + STEP_CENTS)
                }
              >
                +
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={props.onResetProposal}
        >
          50/30/20
        </Button>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={props.onBack}>
          Atrás
        </Button>
        <Button className="flex-1" onClick={props.onSubmit}>
          Aplicar corrección
        </Button>
      </div>
    </div>
  );
}
```

Nota: si `text-warning-ink` / `text-danger-ink` no existen como token, usa los tokens equivalentes ya presentes en `app/globals.css` (buscar las clases usadas por `coach-card.tsx` para warning y error).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run modules/cycle-correction/components/__tests__/wizard-steps.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/cycle-correction/components/wizard-step-income.tsx modules/cycle-correction/components/wizard-step-reserved.tsx modules/cycle-correction/components/wizard-step-split.tsx modules/cycle-correction/components/__tests__/wizard-steps.test.tsx
git commit -m "feat(cycle-correct): pasos del wizard de correccion"
```

---

### Task 4: Contenedor del wizard + integración en la vista

**Files:**
- Create: `modules/cycle-correction/components/cycle-correct-wizard.tsx`
- Modify: `modules/cycle-correction/components/cycle-correct-view.tsx` (reemplazar el cuerpo por el wizard; conservar skeleton y el estado "sin ciclo activo")

**Interfaces:**
- Consumes: `buildSimpleCorrectionPlan`, `proposeRemainingByEnvelope`, `computeFreeCents` (Task 1); `simpleCorrectionWizardSchema` (Task 2); `WizardStepIncome/Reserved/Split` (Task 3); `api.dashboard.getSummary`, `api.settings.getSettingsOverview`, `api.cycleCorrection.correctActiveCycleAllocation`, `api.fixedCommitments.createFixedCommitment`; `ALLOCATION_CORRECT_STARTED/COMPLETED` de `@/core/analytics`; `fromConvexError` de `@/core/errors`.
- Produces: `CycleCorrectWizard` (sin props), renderizado por `CycleCorrectView`.

- [ ] **Step 1: Write the failing test**

```tsx
// modules/cycle-correction/components/__tests__/cycle-correct-wizard.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CycleCorrectWizard } from "../cycle-correct-wizard";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

import { useQuery, useMutation } from "convex/react";

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);

function mockBackend() {
  mockedUseQuery.mockImplementation((query: unknown) => {
    if (query === "settings:getSettingsOverview") {
      return {
        allocations: { needs: 50, wants: 30, savings: 20 },
      };
    }
    return {
      profile: { currencyCode: "PEN" },
      cycle: {
        id: "cycle1",
        unallocatedCents: 0,
        needsReview: false,
      },
      envelopes: [
        { type: "needs", allocatedAmount: 380_000, remainingAmount: 380_000 },
        { type: "wants", allocatedAmount: 0, remainingAmount: 0 },
        { type: "savings", allocatedAmount: 0, remainingAmount: 0 },
      ],
      commitments: [{ id: "c1", name: "Cuota auto", amount: 250_000 }],
    };
  });
  mockedUseMutation.mockReturnValue(vi.fn().mockResolvedValue("c1"));
}

describe("CycleCorrectWizard", () => {
  it("paso 1 prellena con el total del ciclo y avanza al paso 2", async () => {
    mockBackend();
    render(<CycleCorrectWizard />);
    const input = screen.getByLabelText(/ingreso real del ciclo/i);
    expect((input as HTMLInputElement).value).toBe("3800.00");
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(
      screen.getByText(/cuánto ya tiene dueño/i),
    ).toBeInTheDocument();
  });

  it("flujo completo: reserva existente y aplica", async () => {
    mockBackend();
    const correct = vi.fn().mockResolvedValue(null);
    mockedUseMutation.mockImplementation((mutation: unknown) =>
      mutation === "fixedCommitments:createFixedCommitment"
        ? vi.fn().mockResolvedValue("c-new")
        : correct,
    );
    render(<CycleCorrectWizard />);
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    fireEvent.change(
      screen.getByLabelText(/monto apartado/i),
      { target: { value: "2500" } },
    );
    fireEvent.click(
      screen.getByLabelText(/de un compromiso que ya tengo/i),
    );
    fireEvent.change(screen.getByLabelText(/compromiso$/i), {
      target: { value: "c1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    await waitFor(() =>
      expect(screen.getByText(/reparte lo libre/i)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /aplicar corrección/i }));
    await waitFor(() => expect(correct).toHaveBeenCalled());
    const args = correct.mock.calls[0][0];
    expect(args.reserveToCommitments).toEqual([
      { commitmentId: "c1", amountCents: 250_000 },
    ]);
    expect(args.setUnallocatedCents).toBe(0);
  });
});
```

Nota: los mocks de `useQuery`/`useMutation` por identidad de query pueden necesitar ajuste al API real de Convex (primer argumento es la función de api). El ejecutor debe mockear comparando la referencia: `query === api.settings.getSettingsOverview`. Importa `api` real en el test para eso (es estable, solo tipos+refs).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run modules/cycle-correction/components/__tests__/cycle-correct-wizard.test.tsx`
Expected: FAIL (no existe `CycleCorrectWizard`).

- [ ] **Step 3: Write the container**

```tsx
// modules/cycle-correction/components/cycle-correct-wizard.tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AnalyticsEvents, track } from "@/core/analytics";
import { fromConvexError } from "@/core/errors";
import { parseToCents } from "@/shared/lib/money";
import {
  buildSimpleCorrectionPlan,
  computeFreeCents,
  proposeRemainingByEnvelope,
  type EnvelopeTargets,
} from "../lib/simple-correction-plan";
import { simpleCorrectionWizardSchema } from "../lib/simple-correction-schema";
import { WizardStepIncome } from "./wizard-step-income";
import { WizardStepReserved } from "./wizard-step-reserved";
import { WizardStepSplit } from "./wizard-step-split";

type Mode = "existing" | "create" | "generic";

const EMPTY_NEW_COMMITMENT = {
  name: "",
  amountCents: 0,
  dueDay: 1,
  envelope: "needs" as const,
};

export function CycleCorrectWizard() {
  const router = useRouter();
  const summary = useQuery(api.dashboard.getSummary, {});
  const settings = useQuery(api.settings.getSettingsOverview, {});
  const correct = useMutation(
    api.cycleCorrection.correctActiveCycleAllocation,
  );
  const createCommitment = useMutation(
    api.fixedCommitments.createFixedCommitment,
  );

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [incomeText, setIncomeText] = useState("");
  const [reservedText, setReservedText] = useState("");
  const [reservedMode, setReservedMode] = useState<Mode>("existing");
  const [commitmentId, setCommitmentId] = useState("");
  const [newCommitment, setNewCommitment] = useState(EMPTY_NEW_COMMITMENT);
  const [targets, setTargets] = useState<EnvelopeTargets>({
    needs: 0,
    wants: 0,
    savings: 0,
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [startedTracked, setStartedTracked] = useState(false);

  const currencyCode = summary?.profile.currencyCode ?? "PEN";
  const allocation = useMemo(
    () =>
      settings?.allocations ?? { needs: 50, wants: 30, savings: 20 },
    [settings],
  );

  const incomeCents = parseToCents(incomeText) ?? 0;
  const reservedCents = parseToCents(reservedText) ?? 0;

  const spentPerEnvelope = useMemo<EnvelopeTargets>(() => {
    const envelopes = summary?.envelopes ?? [];
    const spent = (type: "needs" | "wants" | "savings") => {
      const envelope = envelopes.find((e) => e.type === type);
      if (!envelope) return 0;
      return Math.max(
        0,
        (envelope.allocatedAmount ?? 0) - (envelope.remainingAmount ?? 0),
      );
    };
    return {
      needs: spent("needs"),
      wants: spent("wants"),
      savings: spent("savings"),
    };
  }, [summary]);

  const freeCents = computeFreeCents({
    incomeCents,
    reservedWithCommitmentCents: reservedMode === "generic" ? 0 : reservedCents,
    reservedGenericCents: reservedMode === "generic" ? reservedCents : 0,
  });

  if (summary && !startedTracked) {
    setStartedTracked(true);
    if (summary.cycle) {
      track(AnalyticsEvents.ALLOCATION_CORRECT_STARTED, {
        cycle_id: summary.cycle.id,
        needs_review: summary.cycle.needsReview === true,
      });
    }
  }

  if (summary === undefined || settings === undefined) {
    return <p className="py-8 text-center text-sm text-mute">Cargando…</p>;
  }
  if (!summary.cycle) {
    return (
      <section className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-serif text-2xl text-ink">Corregir distribución</h1>
        <p className="mt-2 text-sm text-mute">
          Necesitas un ciclo activo para corregir cómo está repartido tu
          dinero.
        </p>
      </section>
    );
  }

  const hydratedIncome = incomeText === "" && incomeCents === 0
    ? String(summary.cycle.totalIncomeCents ? summary.cycle.totalIncomeCents / 100 : "")
    : incomeText;

  function startStep3() {
    const proposal = proposeRemainingByEnvelope({
      freeCents,
      allocation,
      spentPerEnvelope,
    });
    setTargets(proposal);
    setStep(3);
  }

  function resetProposal() {
    setTargets(
      proposeRemainingByEnvelope({ freeCents, allocation, spentPerEnvelope }),
    );
  }

  const assigned = targets.needs + targets.wants + targets.savings;
  const overrunWarning =
    spentPerEnvelope.needs > targets.needs ||
    spentPerEnvelope.wants > targets.wants ||
    spentPerEnvelope.savings > targets.savings
      ? "Ya gastaste más de lo que te tocaría en algún sobre; ese sobre queda en 0 y el resto se ajusta con lo que te queda."
      : null;

  async function apply() {
    setServerError(null);
    const parsed = simpleCorrectionWizardSchema.safeParse({
      incomeCents,
      reservedMode,
      reservedCents,
      commitmentId: commitmentId || undefined,
      newCommitment:
        reservedMode === "create" ? newCommitment : undefined,
      targets,
    });
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }
    try {
      setSaving(true);
      let effectiveCommitmentId = commitmentId;
      if (reservedMode === "create") {
        effectiveCommitmentId = await createCommitment({
          name: newCommitment.name,
          amount: newCommitment.amountCents,
          envelope: newCommitment.envelope,
          dueDay: newCommitment.dueDay,
        });
      }
      const plan = buildSimpleCorrectionPlan({
        incomeCents,
        reservedWithCommitmentCents:
          reservedMode === "generic" ? 0 : reservedCents,
        reservedGenericCents:
          reservedMode === "generic" ? reservedCents : 0,
        commitmentId: effectiveCommitmentId,
        allocation,
        spentPerEnvelope,
        targets,
      });
      await correct({
        setEnvelopeRemaining: plan.remainingByEnvelope,
        setUnallocatedCents: plan.unallocatedCents,
        reserveToCommitments: plan.reserveToCommitments.map((row) => ({
          commitmentId: row.commitmentId as Id<"fixedCommitments">,
          amountCents: row.amountCents,
        })),
        note: "Corrección guiada del ciclo",
      });
      track(AnalyticsEvents.ALLOCATION_CORRECT_COMPLETED, {
        cycle_id: summary.cycle.id,
        mode: reservedMode,
      });
      router.push("/dashboard");
    } catch (error) {
      setServerError(fromConvexError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-8">
      {step === 1 ? (
        <WizardStepIncome
          amountText={hydratedIncome}
          currencyCode={currencyCode}
          onAmountChange={setIncomeText}
          onNext={() => setStep(2)}
        />
      ) : null}
      {step === 2 ? (
        <WizardStepReserved
          incomeCents={incomeCents}
          reservedText={reservedText}
          reservedMode={reservedMode}
          commitmentId={commitmentId}
          newCommitment={newCommitment}
          commitments={(summary.commitments ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            amount: c.amount,
          }))}
          currencyCode={currencyCode}
          onReservedChange={setReservedText}
          onModeChange={setReservedMode}
          onCommitmentChange={setCommitmentId}
          onNewCommitmentChange={setNewCommitment}
          onBack={() => setStep(1)}
          onNext={() => {
            setNewCommitment((current) => ({
              ...current,
              amountCents: reservedCents,
            }));
            startStep3();
          }}
        />
      ) : null}
      {step === 3 ? (
        <>
          <WizardStepSplit
            freeCents={freeCents}
            targets={targets}
            currencyCode={currencyCode}
            overrunWarning={overrunWarning}
            onTargetChange={(key, cents) =>
              setTargets((current) => ({ ...current, [key]: cents }))
            }
            onResetProposal={resetProposal}
            onBack={() => setStep(2)}
            onSubmit={apply}
          />
          {assigned > freeCents ? (
            <p className="mt-2 text-[12px] text-danger-ink">
              Los sobres no pueden superar el dinero libre.
            </p>
          ) : null}
          {serverError ? (
            <p className="mt-2 text-sm text-danger-ink">{serverError}</p>
          ) : null}
          {saving ? (
            <p className="mt-2 text-sm text-mute">Guardando…</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
```

Notas del ejecutor (adaptar con criterio, sin romper la interfaz de los pasos):
- Si `summary.cycle` no expone `totalIncomeCents`, quita el prellenado (dejar campo vacío) — es un niceto, no requisito.
- El botón "Aplicar corrección" del paso 3 debe deshabilitarse si `assigned > freeCents` o `saving` (agregar props `disabled` a `WizardStepSplit` si hace falta; ajustar también su test del Task 3).
- `setStartedTracked` en render es intencional para evitar effect; si el linter lo rechaza, mover a `useEffect` con ref como hace el view actual.

- [ ] **Step 4: Simplify the view**

Reescribir `modules/cycle-correction/components/cycle-correct-view.tsx` dejando solo:

```tsx
"use client";

import { CycleCorrectWizard } from "./cycle-correct-wizard";
import { CycleCorrectViewSkeleton } from "./cycle-correct-view-skeleton";

export function CycleCorrectView() {
  return <CycleCorrectWizardOrFallback />;
}

function CycleCorrectWizardOrFallback() {
  return <CycleCorrectWizard />;
}
```

En la práctica: si `CycleCorrectWizard` ya maneja loading/sin-ciclo internamente (lo hace), `cycle-correct-view.tsx` queda como wrapper trivial o se elimina y `app/(app)/cycle/correct/page.tsx` importa directamente `CycleCorrectWizard`. Prefiere eliminar el wrapper: en `app/(app)/cycle/correct/page.tsx`:

```tsx
import { CycleCorrectWizard } from "@/modules/cycle-correction/components/cycle-correct-wizard";

export default function CycleCorrectPage() {
  return <CycleCorrectWizard />;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run modules/cycle-correction`
Expected: PASS (todos los tests del módulo).

- [ ] **Step 6: Commit**

```bash
git add modules/cycle-correction app/\(app\)/cycle/correct/page.tsx
git commit -m "feat(cycle-correct): wizard de correccion en 3 pasos"
```

---

### Task 5: Eliminar el formulario técnico + verificación final

**Files:**
- Delete: `modules/cycle-correction/components/cycle-correct-envelope-fields.tsx`
- Delete: `modules/cycle-correction/components/cycle-correct-reserve-section.tsx`
- Delete: `modules/cycle-correction/components/cycle-correct-contribute-section.tsx`
- Delete: `modules/cycle-correction/components/cycle-correct-reconciliation-note.tsx`
- Delete: `modules/cycle-correction/components/cycle-correct-money-field.tsx`
- Delete: `modules/cycle-correction/components/cycle-correct-actions.tsx` (si el wizard no lo usa)
- Delete: `modules/cycle-correction/lib/cycle-correct-form-state.ts`
- Delete: `modules/cycle-correction/lib/cycle-correct-reconciliation.ts`
- Delete: `modules/cycle-correction/lib/__tests__/cycle-correct-reconciliation.test.ts` (si solo testeaba esa lib)
- Modify: `docs/QUIPU-MASTER.md` (§8.2: reemplazar la descripción del formulario de corrección por el wizard; Changelog con fecha 2026-08-28)

- [ ] **Step 1: Verificar huérfanos antes de borrar**

Run: `grep -r "cycle-correct-form-state\|cycle-correct-reconciliation\|CycleCorrectEnvelopeFields\|CycleCorrectReserveSection\|CycleCorrectContributeSection\|CycleCorrectReconciliationNote\|CycleCorrectMoneyField\|CycleCorrectActions" --include="*.tsx" --include="*.ts" modules app convex shared`
Expected: solo coincidencias dentro de `modules/cycle-correction` (los archivos a borrar entre sí). Si algo fuera del módulo los usa, NO borrar ese archivo y anotarlo en el resumen.

- [ ] **Step 2: Borrar los archivos huérfanos**

```bash
git rm modules/cycle-correction/components/cycle-correct-envelope-fields.tsx modules/cycle-correction/components/cycle-correct-reserve-section.tsx modules/cycle-correction/components/cycle-correct-contribute-section.tsx modules/cycle-correction/components/cycle-correct-reconciliation-note.tsx modules/cycle-correction/components/cycle-correct-money-field.tsx modules/cycle-correction/components/cycle-correct-actions.tsx modules/cycle-correction/lib/cycle-correct-form-state.ts modules/cycle-correction/lib/cycle-correct-reconciliation.ts modules/cycle-correction/lib/__tests__/cycle-correct-reconciliation.test.ts
```

(Quitar de la lista los que el Step 1 haya marcado como usados fuera.)

- [ ] **Step 3: Suite completa + lint + typecheck**

Run: `pnpm vitest run && pnpm lint`
Expected: PASS sin errores. Si hay typecheck separado (`tsc --noEmit` vía script), correrlo también.

- [ ] **Step 4: Smoke manual**

Con `pnpm dev` + Convex local: ir a `/cycle/correct`, completar el wizard con el caso 3800/2500/1300, aplicar, verificar dashboard y `/movements` muestran la corrección (transferencias internas `cycle_correction`).

- [ ] **Step 5: Commit**

```bash
git add -A modules/cycle-correction docs/QUIPU-MASTER.md
git commit -m "refactor(cycle-correct): elimina formulario tecnico, deja wizard"
```

---

## Self-review (hecha al escribir el plan)

- **Spec coverage:** Paso 1/2/3 + confirmación (Tasks 3–4), zod (Task 2), lógica pura TDD (Task 1), errores/casos borde (tests Task 1–3, `overrunWarning`, bloqueo reservado>ingreso), eliminación del formulario técnico (Task 5), sin cambios backend (ningún task toca `convex/`).
- **Placeholders:** no hay TBD/TODO; las dos "Notas del ejecutor" marcan adaptaciones verificables (nombres de campos de `getSummary`), no huecos de diseño.
- **Type consistency:** `EnvelopeTargets`/`Allocation`/`SimpleCorrectionWizardValues` usados con los mismos nombres en Tasks 1→4; `proposeRemainingByEnvelope({freeCents, allocation, spentPerEnvelope})` coincide entre Task 1 y Tasks 3–4.
