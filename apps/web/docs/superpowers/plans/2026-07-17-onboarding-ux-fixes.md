# Onboarding UX Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 UX issues: step-3 allocation editable + reset, step-2-fixed clearer paydays + cycle preview, step-2-mixed functional with money input and better copy.

**Architecture:** Each fix is independent. Step-3: logic extracted to `lib/allocation.ts`, UI split into `allocation-bar.tsx` + `allocation-row.tsx` (self-contained edit state), orchestrator `step-3-allocation.tsx` (~80 lines). Step-2-fixed removes confusing "Ultimo" pill, adds hint for multi-selection, fixes biweekly cycle preview. Step-2-mixed adds `mixedFixedAmount` field to schema/state and functional money input with updated copy.

**Tech Stack:** Next.js 16, React 19, Convex, shadcn/ui, Tailwind v4, Zod

## Global Constraints
- React Compiler active: no `useCallback`/`useMemo`/`useRef` manual
- Use `cn()` for conditional classes, never template literals
- Money in céntimos, dates in `America/Lima`
- Backend mutations use `ConvexError` with codes
- Schema changes require `npx convex dev` type regeneration
- No `useRouter`/`useSearchParams` in step components
- No `window.history` calls
- Cada archivo una responsabilidad

---

### Task 1: Add `mixedFixedAmount` to backend

**Files:**
- Modify: `convex/schema.ts:28` — add field
- Modify: `convex/profiles.ts:47-52` — add to args
- Modify: `convex/profiles.ts:130` — add to insert

**Interfaces:**
- Consumes: nothing
- Produces: `profiles.mixedFixedAmount: v.optional(v.number())` — cents integer

- [ ] **Step 1: Add field to schema**

In `convex/schema.ts`, after `cycleDurationDays` line, add:

```ts
    mixedFixedAmount: v.optional(v.number()), // centimos, estimado de la parte fija en modelo mixed
```

- [ ] **Step 2: Add to createProfile args**

In `convex/profiles.ts`, after `cycleDurationDays: v.optional(v.number()),` add:

```ts
    mixedFixedAmount: v.optional(v.number()),
```

- [ ] **Step 3: Add to createProfile insert**

In `convex/profiles.ts`, after `cycleDurationDays: args.cycleDurationDays,` add:

```ts
      mixedFixedAmount: args.mixedFixedAmount,
```

- [ ] **Step 4: Regenerate Convex types**

```bash
npx convex dev --once
```

- [ ] **Step 5: Typecheck**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/profiles.ts
git commit -m "feat(backend): add mixedFixedAmount field for mixed income model"
```

---

### Task 2: Update types, constants, schemas

**Files:**
- Modify: `modules/onboarding/types.ts`
- Modify: `modules/onboarding/constants.ts` — remove "Ultimo" from DAY_PILLS
- Modify: `modules/onboarding/schemas.ts`

- [ ] **Step 1: Update types.ts**

Add `mixedFixedAmount` to `OnboardingState`:

```ts
export type OnboardingState = {
  currentStep: 1 | 2 | 3;
  incomeModel: IncomeModel | null;
  payFrequency: PayFrequency | null;
  paydays: number[];
  cycleDurationDays: CycleDuration | null;
  mixedFixedAmount: number | null;
  allocationNeeds: number;
  allocationWants: number;
  allocationSavings: number;
  country: string;
  currencyCode: string;
  currencySymbol: string;
};
```

- [ ] **Step 2: Update constants.ts — remove "Ultimo" from DAY_PILLS**

Change line 61 from:

```ts
export const DAY_PILLS = [15, 30, "Ultimo"] as const;
```

to:

```ts
export const DAY_PILLS = [15, 30] as number[];
```

- [ ] **Step 3: Update constants.ts — add mixedFixedAmount default**

In `ONBOARDING_DEFAULTS`, add:

```ts
  mixedFixedAmount: null,
```

- [ ] **Step 4: Update schemas.ts — add mixedFixedAmount**

In `finalPayloadSchema`, add after `cycleDurationDays`:

```ts
  mixedFixedAmount: z.number().int().min(0).optional(),
```

- [ ] **Step 5: Typecheck**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add modules/onboarding/types.ts modules/onboarding/constants.ts modules/onboarding/schemas.ts
git commit -m "feat(onboarding): add mixedFixedAmount, remove Ultimo day pill"
```

---

### Task 3: Fix step-2-fixed — clearer paydays and cycle preview

**Files:**
- Modify: `modules/onboarding/components/step-2-fixed.tsx`
- Modify: `modules/onboarding/lib/cycle.ts`

**Interfaces:**
- Consumes: `DAY_PILLS: number[]` (without "Ultimo"), `formatCycle(paydays, payFrequency)`
- Produces: same `Step2Fixed` API

- [ ] **Step 1: Update formatCycle in lib/cycle.ts**

Replace entire file:

```ts
const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

export function formatCycle(
  paydays: number[],
  payFrequency: "monthly" | "biweekly",
): string {
  const now = new Date();
  const day = paydays[0] ?? 1;
  const start = new Date(now.getFullYear(), now.getMonth(), day);

  if (payFrequency === "biweekly" && paydays.length >= 2) {
    const secondDay = paydays[1] ?? 15;
    const start2 = new Date(now.getFullYear(), now.getMonth(), secondDay);
    if (start2 <= start) start2.setMonth(start2.getMonth() + 1);
    return `${start.getDate()} y ${start2.getDate()} ${MONTHS[start.getMonth()]}`;
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return `${start.getDate()} ${MONTHS[start.getMonth()]} → ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}
```

- [ ] **Step 2: Rewrite step-2-fixed.tsx**

```tsx
"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { DAY_PILLS } from "../constants";
import { formatCycle } from "../lib/cycle";
import { CheckMark } from "./check-mark";
import { useOnboarding } from "./onboarding-provider";
import { OnboardingShell } from "./onboarding-shell";

type Props = { onBack: VoidFunction; onNext: VoidFunction };

const FREQ_LABEL: Record<"monthly" | "biweekly", string> = {
  monthly: "Mensual",
  biweekly: "Quincenal",
};

const FREQ_DESC: Record<"monthly" | "biweekly", string> = {
  monthly: "Un pago al mes",
  biweekly: "Dos pagos al mes",
};

export function Step2Fixed({ onBack, onNext }: Props) {
  const { state, dispatch } = useOnboarding();
  const isBiweekly = state.payFrequency === "biweekly";
  const cycleDays = isBiweekly ? 15 : 30;
  const canContinue = !!state.payFrequency && state.paydays.length > 0;

  function selectDay(day: number) {
    if (isBiweekly) {
      const currentDays = state.paydays;
      if (currentDays.includes(day)) {
        // unselect — but keep at least one
        const next = currentDays.filter((d) => d !== day);
        dispatch({ type: "UPDATE", payload: { paydays: next.length ? next : [day] } });
      } else if (currentDays.length >= 2) {
        // replace oldest selected
        const next = [currentDays[1]!, day];
        dispatch({ type: "UPDATE", payload: { paydays: next } });
      } else {
        dispatch({ type: "UPDATE", payload: { paydays: [...currentDays, day] } });
      }
    } else {
      dispatch({ type: "UPDATE", payload: { paydays: [day] } });
    }
  }

  return (
    <OnboardingShell
      currentStep={2}
      title="¿Cada cuánto te pagan?"
      subtitle="Tu ciclo empieza el día que recibes tu sueldo."
      onBack={onBack}
      cta={
        <Button onClick={onNext} disabled={!canContinue} size="lg">
          Continuar →
        </Button>
      }
    >
      <div className="flex gap-3">
        {(["monthly", "biweekly"] as const).map((freq) => {
          const selected = state.payFrequency === freq;
          return (
            <button
              key={freq}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() =>
                dispatch({
                  type: "UPDATE",
                  payload: {
                    payFrequency: freq,
                    paydays: freq === "biweekly" ? [1, 15] : [1],
                  },
                })
              }
              className={cn(
                "flex flex-1 items-center justify-between rounded-xl border-2 p-5 text-left",
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:border-primary/50",
              )}
            >
              <div>
                <p className="font-semibold">{FREQ_LABEL[freq]}</p>
                <p className="mt-1 text-sm text-muted-foreground">{FREQ_DESC[freq]}</p>
              </div>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  selected ? "bg-primary" : "border-2 border-border",
                )}
              >
                {selected && <CheckMark size={12} />}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-sm font-medium">
        {isBiweekly ? "Días de pago" : "Día de pago"}
      </p>
      {isBiweekly && (
        <p className="text-xs text-muted-foreground">Selecciona 2 días</p>
      )}
      <div className="flex flex-wrap gap-2">
        {DAY_PILLS.map((day) => {
          const selected = state.paydays?.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => selectDay(day)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm",
                selected
                  ? "border-primary bg-primary-soft font-semibold text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              Día {day}
            </button>
          );
        })}
      </div>

      {state.paydays && state.paydays.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-soft p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tu ciclo
          </span>
          <span className="font-serif text-base text-foreground">
            {formatCycle(state.paydays, state.payFrequency!)}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-sm text-primary">
            <span className="size-2 rounded-full bg-primary" />
            {cycleDays} días
          </span>
        </div>
      )}
    </OnboardingShell>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add modules/onboarding/components/step-2-fixed.tsx modules/onboarding/lib/cycle.ts
git commit -m "fix(onboarding): clearer payday selection, correct biweekly cycle preview"
```

---

### Task 4: Fix step-2-mixed — functional money input + better copy

**Files:**
- Modify: `modules/onboarding/components/step-2-mixed.tsx`

**Interfaces:**
- Consumes: `DAY_PILLS: number[]`, `useOnboarding` with `state.mixedFixedAmount`
- Produces: same `Step2Mixed` API

- [ ] **Step 1: Write step-2-mixed.tsx**

```tsx
"use client";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { DAY_PILLS } from "../constants";
import { useOnboarding } from "./onboarding-provider";
import { OnboardingShell } from "./onboarding-shell";

type Props = { onBack: VoidFunction; onNext: VoidFunction };

export function Step2Mixed({ onBack, onNext }: Props) {
  const { state, dispatch } = useOnboarding();
  const mixedDay = state.paydays?.[0] ?? 1;
  const displayAmount =
    state.mixedFixedAmount != null
      ? (state.mixedFixedAmount / 100).toFixed(2)
      : "";

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
      .replace(/[^0-9.]/g, "")
      .replace(/^0+(?=\d)/, "");
    const num = Number.parseFloat(raw);
    dispatch({
      type: "UPDATE",
      payload: {
        mixedFixedAmount: Number.isNaN(num) ? null : Math.round(num * 100),
      },
    });
  }

  return (
    <OnboardingShell
      currentStep={2}
      title="Combinemos lo fijo y lo variable"
      subtitle="Configura tu parte previsible; el resto entra cuando lo registres."
      onBack={onBack}
      cta={
        <Button onClick={onNext} size="lg">
          Continuar →
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="size-3 rounded-full bg-needs" />
            <p className="font-semibold">Ingreso previsible</p>
            <span className="text-xs text-muted-foreground">
              · sueldo, mensualidad
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg border border-border bg-surface p-3">
              <label className="text-xs text-muted-foreground">
                ¿Cuánto recibes normalmente cada mes?
              </label>
              <div className="relative mt-1">
                <span className="absolute left-0 top-0 font-serif text-xl text-muted-foreground">
                  S/
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  placeholder="—"
                  className="border-none bg-transparent p-0 pl-7 font-serif text-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                />
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Es una estimación. Podrás cambiarla después.
              </p>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-muted-foreground">Día de pago</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {DAY_PILLS.map((day) => (
                  <DayPill
                    key={day}
                    label={`Día ${day}`}
                    selected={mixedDay === day}
                    onClick={() =>
                      dispatch({
                        type: "UPDATE",
                        payload: { paydays: [day] },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="size-3 rounded-full bg-clay" />
            <p className="font-semibold">Ingresos variables</p>
            <span className="text-xs text-muted-foreground">
              · proyectos, ventas
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Proyectos", "Ventas", "Servicios"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            <span className="rounded-full border border-dashed border-border bg-surface-soft px-3 py-1.5 text-sm text-muted-foreground">
              + Agregar
            </span>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

function DayPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: VoidFunction;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm",
        selected
          ? "border-primary bg-primary-soft font-semibold text-primary"
          : "border-border text-muted-foreground hover:border-primary/50",
      )}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add modules/onboarding/components/step-2-mixed.tsx
git commit -m "fix(onboarding): functional money input in mixed step, better copy"
```

---

### Task 5: Fix step-3-allocation — editable inputs + reset button (SPLIT)

**Problem:** El step-3-allocation original es GOD component (200+ líneas): lógica de distribución, inputs editables, barra visual, estados locales, handlers de blur/keydown/arrow. Viola KISS, DRY, y regla de "un archivo una responsabilidad".

**Fix:** 4 archivos. Lógica pura separada, UI atomizada.

**Files:**
- Create: `modules/onboarding/lib/allocation.ts`
- Create: `modules/onboarding/components/allocation-bar.tsx`
- Create: `modules/onboarding/components/allocation-row.tsx`
- Rewrite: `modules/onboarding/components/step-3-allocation.tsx`

**Interfaces:**
- `lib/allocation.ts` exports: `distributeEnvelope(state, key, newValue) → AllocationValues`
- `allocation-bar.tsx` exports: `<AllocationBar needs wants savings />`
- `allocation-row.tsx` exports: `<AllocationRow envKey label desc barColor value onCommit />` — maneja su propio estado local de edición
- `step-3-allocation.tsx` exports: `<Step3Allocation onBack onComplete />` — orquestador (~80 líneas)

- [ ] **Step 1: Create lib/allocation.ts — pure logic**

```ts
import type { OnboardingState } from "../types";

type Allocation = Pick<OnboardingState, "allocationNeeds" | "allocationWants" | "allocationSavings">;

const KEYS = ["allocationNeeds", "allocationWants", "allocationSavings"] as const;

export function distributeEnvelope(
  state: Allocation,
  key: (typeof KEYS)[number],
  newValue: number,
): Allocation {
  const clamped = Math.max(0, Math.min(100, newValue));
  if (clamped === state[key]) return state;

  const others = KEYS.filter((k) => k !== key);
  const o1 = state[others[0]!];
  const o2 = state[others[1]!];
  const diff = clamped - state[key];

  let n1: number;
  let n2: number;
  if (o1 > 0 && o2 > 0) {
    const ratio = o1 / (o1 + o2);
    const adj1 = Math.round(diff * ratio);
    n1 = Math.max(0, o1 - adj1);
    n2 = Math.max(0, o2 - (diff - adj1));
  } else if (o1 > 0) {
    n1 = Math.max(0, o1 - diff);
    n2 = o2;
  } else {
    n1 = o1;
    n2 = Math.max(0, o2 - diff);
  }

  return { ...state, [key]: clamped, [others[0]!]: n1, [others[1]!]: n2 };
}

export const ALLOCATION_DEFAULTS: Allocation = {
  allocationNeeds: 50,
  allocationWants: 30,
  allocationSavings: 20,
};
```

- [ ] **Step 2: Create allocation-bar.tsx — pure visual**

```tsx
type Props = { needs: number; wants: number; savings: number };

export function AllocationBar({ needs, wants, savings }: Props) {
  return (
    <div className="flex h-4 overflow-hidden rounded-lg ring-1 ring-inset ring-black/5">
      <div className="bg-needs transition-all" style={{ width: `${needs}%` }} />
      <div className="bg-clay transition-all" style={{ width: `${wants}%` }} />
      <div className="bg-moss transition-all" style={{ width: `${savings}%` }} />
    </div>
  );
}
```

- [ ] **Step 3: Create allocation-row.tsx — one row with edit state**

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { ENVELOPES, type EnvelopeKey } from "../constants";
import { distributeEnvelope, type ALLOCATION_DEFAULTS } from "../lib/allocation";

type Allocation = typeof ALLOCATION_DEFAULTS;

type Props = {
  envKey: EnvelopeKey;
  label: string;
  desc: string;
  barColor: string;
  value: number;
  state: Allocation;
  dispatch: (payload: Partial<Allocation>) => void;
};

export function AllocationRow({
  envKey,
  label,
  desc,
  barColor,
  value,
  state,
  dispatch,
}: Props) {
  const [draft, setDraft] = useState(String(value));

  function commit(raw: string) {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) {
      setDraft(String(value));
      return;
    }
    const next = distributeEnvelope(state, envKey, n);
    dispatch(next);
    setDraft(String(next[envKey]));
  }

  function adjust(delta: number) {
    const next = distributeEnvelope(state, envKey, value + delta);
    dispatch(next);
    setDraft(String(next[envKey]));
  }

  return (
    <div className="flex items-center gap-4">
      <span className={cn("size-3 shrink-0 rounded-full", barColor)} />
      <div className="flex-1">
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => adjust(-5)}
          className="flex size-7 items-center justify-center rounded-md bg-surface text-muted-foreground hover:text-foreground"
          aria-label={`Reducir ${label}`}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(draft); }}
          min={0}
          max={100}
          className="w-12 border-none bg-transparent p-0 text-center font-serif text-lg text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus:outline-none"
        />
        <button
          type="button"
          onClick={() => adjust(5)}
          className="flex size-7 items-center justify-center rounded-md bg-surface text-muted-foreground hover:text-foreground"
          aria-label={`Aumentar ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite step-3-allocation.tsx — orchestrator only**

```tsx
"use client";

import { useTransition } from "react";
import { Button } from "@/shared/components/ui/button";
import { completeOnboardingAction } from "../actions";
import { ENVELOPES } from "../constants";
import { ALLOCATION_DEFAULTS } from "../lib/allocation";
import { AllocationBar } from "./allocation-bar";
import { AllocationRow } from "./allocation-row";
import { CheckMark } from "./check-mark";
import { useOnboarding } from "./onboarding-provider";
import { OnboardingShell } from "./onboarding-shell";

type Props = { onBack: VoidFunction; onComplete: VoidFunction };

export function Step3Allocation({ onBack, onComplete }: Props) {
  const { state, dispatch } = useOnboarding();
  const [isPending, startTransition] = useTransition();
  const total = state.allocationNeeds + state.allocationWants + state.allocationSavings;
  const isDefault = state.allocationNeeds === 50 && state.allocationWants === 30 && state.allocationSavings === 20;

  function reset() {
    dispatch({ type: "UPDATE", payload: ALLOCATION_DEFAULTS });
  }

  function submit() {
    if (total !== 100) return;
    startTransition(async () => {
      try {
        await completeOnboardingAction(state);
        onComplete();
      } catch {
        // error handled by fromConvexError
      }
    });
  }

  return (
    <OnboardingShell
      currentStep={3}
      title="¿Cómo repartes lo que entra?"
      subtitle="La regla 50/30/20 es un buen punto de partida. Ajusta si lo necesitas."
      onBack={onBack}
      cta={
        <Button onClick={submit} disabled={total !== 100 || isPending} size="lg">
          {isPending ? "Creando sistema…" : "Crear mi sistema →"}
        </Button>
      }
    >
      <AllocationBar
        needs={state.allocationNeeds}
        wants={state.allocationWants}
        savings={state.allocationSavings}
      />

      <div className="flex flex-col gap-3">
        {ENVELOPES.map((env) => (
          <AllocationRow
            key={env.key}
            envKey={env.key}
            label={env.label}
            desc={env.desc}
            barColor={env.barColor}
            value={state[env.key]}
            state={state}
            dispatch={(payload) => dispatch({ type: "UPDATE", payload })}
          />
        ))}
      </div>

      <div className="flex items-center gap-4">
        {total === 100 ? (
          <div className="flex items-center gap-2 text-sm text-primary">
            <span className="flex size-4 items-center justify-center rounded-full bg-primary-soft">
              <CheckMark size={10} strokeWidth={3.5} />
            </span>
            Suma 100% · listo
          </div>
        ) : (
          <div className="rounded-lg bg-danger-bg p-3 text-sm text-danger-ink" role="alert">
            El reparto suma {total}%. Ajusta para que sea exactamente 100% antes de continuar.
          </div>
        )}
        {!isDefault && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
          >
            Reiniciar a 50/30/20
          </button>
        )}
      </div>
    </OnboardingShell>
  );
}
```

- [ ] **Step 5: Typecheck**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add modules/onboarding/lib/allocation.ts modules/onboarding/components/allocation-bar.tsx modules/onboarding/components/allocation-row.tsx modules/onboarding/components/step-3-allocation.tsx
git commit -m "fix(onboarding): editable allocations, split into 4 files per KISS

- lib/allocation.ts: pure distributeEnvelope logic
- allocation-bar.tsx: visual bar
- allocation-row.tsx: one row, self-contained edit state
- step-3-allocation.tsx: orchestrator (~80 lines, was 200+)"
```

---

### Task 6: Verify end-to-end

- [ ] **Step 1: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Lint**

```bash
pnpm lint
```
Expected: no new errors from `modules/onboarding/`.

- [ ] **Step 3: Manual smoke (browser)**

1. `npx convex dev` + `pnpm dev`
2. Sign-up → `/onboarding`
3. Step 1: select dependiente
4. Step 2: verify "Día 15" / "Día 30" pills, multi-select works for quincenal, labels change
5. Step 2: verify formatCycle shows both days for quincenal (not single day)
6. Step 3: verify number inputs work, reset 50/30/20 link appears and works
7. Back to step 1, select mixtos
8. Step 2: verify "¿Cuánto recibes..." input works, money shows correctly
9. Complete wizard, verify redirect to dashboard
