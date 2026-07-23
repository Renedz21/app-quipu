# Onboarding v3.0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3-step onboarding wizard from `quipu-2.html` Bloque 2. User picks income model, configures their system (contextual per income type), sets 50/30/20 split, and creates their profile.

**Architecture:** Single route `/configurar` renders `OnboardingWizard` client component. Internal `useState` for step tracking (no URL sync, no query params). `OnboardingProvider` context holds form state with `useReducer` + `sessionStorage` hydration. Server action `completeOnboardingAction` calls `createProfile` and redirects to `/dashboard`.

**Tech Stack:** Next.js 16 App Router, React 19, Convex, shadcn/ui, Zod

**Design source:** `quipu-2.html` lines 381-635 (Bloque 2 · Onboarding)

## Design Summary (from quipu-2.html)

### Step 1 — Perfil: "¿Cómo recibes tu dinero?"
- 3 radio cards: Trabajador dependiente / Trabajador independiente / Ingresos mixtos
- Maps to `incomeModel: "fixed" | "variable" | "mixed"`
- Selected card has `border-primary bg-primary-soft`, radio dot fills green

### Step 2 — Sistema: Contextual per incomeModel
- **Dependiente (fixed):** "¿Cada cuánto te pagan?" — Mensual/Quincenal radio + day selector pills (15, 30, Último, Otro…) + cycle preview bar ("Tu ciclo: 30 jun → 30 jul · 30 días")
- **Independiente (variable):** "¿Cómo prefieres tus ciclos?" — 15 días / 30 días cards + info banner
- **Mixto (mixed):** "Combinemos lo fijo y lo variable" — Fixed section (monto + día de pago pills) + variable tags (Proyectos, Ventas, Servicios, + Agregar)

### Step 3 — Reparto: "¿Cómo repartes lo que entra?"
- Barra segmentada (needs/clay/moss)
- 3 rows: Necesidades / Gustos / Ahorro with -/+ steppers (5% increments)
- Defaults: 50/30/20
- "Crear mi sistema →" CTA, disabled if sum != 100

### Post-submit: Success screen (from HTML "Resumen")
- Green check circle, "Tu sistema está listo, [nombre]"
- 3 summary cards: Perfil, Ciclo, Reparto
- "Entrar a Quipu →" CTA → redirects to `/dashboard`

## Global Constraints
- No `?step=` query param, no `window.history` calls, no URL effects
- No `useRouter` or `useSearchParams` in step components
- Server action calls `createProfile` (not 2 mutations — commitments step removed per new design)
- `name` is optional in `createProfile`, falls back to `identity.name` from Better Auth
- `cycleDurationDays: 15 | 30` field added to profiles schema for variable income
- Money in céntimos, dates in `America/Lima`, errors via `ConvexError` with codes
- `'use client'` on wizard, provider, and step components only
- React Compiler active: no manual `memo`/`useCallback`/`useMemo` without profiler evidence

---

## File Structure

```
modules/onboarding/
├── components/
│   ├── onboarding-wizard.tsx          # useState(1|2|3) orchestrator
│   ├── onboarding-provider.tsx        # Context + useReducer + sessionStorage
│   ├── onboarding-shell.tsx           # Layout: stepper bar + title + children + nav
│   ├── step-1-income-profile.tsx      # 3 radio cards
│   ├── step-2-system-config.tsx       # Contextual: fixed/variable/mixed branches
│   ├── step-3-allocation.tsx          # 50/30/20 with -/+ buttons
│   └── step-success.tsx              # Post-submit summary + "Entrar a Quipu"
├── types.ts
├── constants.ts
├── schemas.ts
├── actions.ts
└── queries.ts
```

### Files to KEEP (already modified correctly)
- `convex/schema.ts` — `cycleDurationDays: v.optional(v.number())` added at line 29
- `convex/profiles.ts` — `name: v.optional(v.string())` at args, fallback to `identity.name` at line 68, `cycleDurationDays` in insert at ~line 131
- `app/(onboarding)/layout.tsx` — clean auth gate, fixed unused import
- `app/(onboarding)/configurar/page.tsx` — simplified, no parseStepId, no searchParams

### Files to DELETE (created by this session, not needed for v3.0)
- `modules/onboarding/components/income-model-card.tsx` — cards are inline in step components
- `modules/onboarding/components/stepper.tsx` — stepper is inline in onboarding-shell

### Files to REWRITE (needs correction from current state)
- `modules/onboarding/components/onboarding-wizard.tsx` — remove URL effects
- `modules/onboarding/components/onboarding-provider.tsx` — keep mostly
- `modules/onboarding/components/onboarding-shell.tsx` — adjust for no-URL nav
- `modules/onboarding/components/step-1-income-profile.tsx` — remove pushState
- `modules/onboarding/components/step-2-system-config.tsx` — remove pushState/useRouter
- `modules/onboarding/components/step-3-allocation.tsx` — remove pushState/useRouter
- `modules/onboarding/components/step-success.tsx` — NEW
- `modules/onboarding/schemas.ts` — add step3 refinement fix
- `modules/onboarding/actions.ts` — ensure name not required

### Files to KEEP AS-IS (already correct)
- `modules/onboarding/types.ts`
- `modules/onboarding/constants.ts`
- `modules/onboarding/queries.ts`

---

### Task 1: Clean up unused files and verify backend

**Files:**
- Delete: `modules/onboarding/components/income-model-card.tsx`
- Delete: `modules/onboarding/components/stepper.tsx`
- Verify: `convex/schema.ts` (cycleDurationDays at profile line 29)
- Verify: `convex/profiles.ts` (name optional line 28-29, fallback line 68, cycleDurationDays insert line ~131)

**Interfaces:**
- Consumes: nothing
- Produces: clean slate for Task 2

- [ ] **Step 1: Delete income-model-card.tsx**
- [ ] **Step 2: Delete stepper.tsx**
- [ ] **Step 3: Verify schema.ts has `cycleDurationDays: v.optional(v.number())` in profiles table**

Read `convex/schema.ts` lines 25-30. Confirm:
```ts
incomeModel: v.optional(
  v.union(v.literal("fixed"), v.literal("variable"), v.literal("mixed")),
),
cycleDurationDays: v.optional(v.number()),
```

- [ ] **Step 4: Verify profiles.ts has name optional and cycleDurationDays in args and insert**

Read `convex/profiles.ts`. Confirm at args:
```ts
name: v.optional(v.string()),
```
Confirm fallback at handler:
```ts
const name = (args.name ?? identity.name ?? "").trim();
```
Confirm insert includes:
```ts
cycleDurationDays: args.cycleDurationDays,
```

- [ ] **Step 5: Run typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add modules/onboarding/components/income-model-card.tsx modules/onboarding/components/stepper.tsx
git add convex/schema.ts convex/profiles.ts
git commit -m "chore(onboarding): clean unused components, verify backend changes"
```

---

### Task 2: Rewrite onboarding-provider.tsx

**Files:**
- Write: `modules/onboarding/components/onboarding-provider.tsx`

**Interfaces:**
- Consumes: `types.ts` (OnboardingState, OnboardingAction), `constants.ts` (ONBOARDING_DEFAULTS, STORAGE_KEY)
- Produces: `OnboardingProvider` component, `useOnboarding` hook

- [ ] **Step 1: Write the file**

```tsx
"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { OnboardingState, OnboardingAction } from "../types";
import { ONBOARDING_DEFAULTS, STORAGE_KEY } from "../constants";

function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState {
  switch (action.type) {
    case "UPDATE":
      return { ...state, ...action.payload };
    case "RESET":
      return { ...ONBOARDING_DEFAULTS };
    case "HYDRATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

type OnboardingContextValue = {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(onboardingReducer, ONBOARDING_DEFAULTS);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<OnboardingState>;
        dispatch({ type: "HYDRATE", payload: parsed });
      } catch {
        // ignore corrupt data
      }
    }
  }, []);

  const persist = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full
    }
  }, [state]);

  useEffect(() => {
    persist();
  }, [state, persist]);

  return (
    <OnboardingContext.Provider value={{ state, dispatch }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add modules/onboarding/components/onboarding-provider.tsx
git commit -m "feat(onboarding): rewrite provider without step tracking"
```

---

### Task 3: Rewrite onboarding-shell.tsx

**Files:**
- Write: `modules/onboarding/components/onboarding-shell.tsx`

**Interfaces:**
- Consumes: `constants.ts` (STEP_COUNT, STEP_LABELS)
- Produces: `OnboardingShell` component — receives `currentStep`, `title`, `subtitle`, children, optional `onBack`/`cta`

- [ ] **Step 1: Write the file**

```tsx
"use client";

import type { ReactNode } from "react";
import { STEP_COUNT, STEP_LABELS } from "../constants";

type Props = {
  currentStep: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  cta?: ReactNode;
};

export function OnboardingShell({
  currentStep,
  title,
  subtitle,
  children,
  onBack,
  cta,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      {/* Stepper bar */}
      <div className="flex items-center gap-3">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isComplete = step < currentStep;
          return (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isComplete || isActive
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {isComplete ? (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path
                        d="M1 3l2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    step
                  )}
                </span>
                <span
                  className={`text-xs font-medium ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <span className="mx-1 h-px w-4 bg-border" />
              )}
            </div>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold" tabIndex={-1}>
          {title}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      {/* Content */}
      {children}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Atrás
          </button>
        ) : (
          <div />
        )}
        {cta && <div>{cta}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add modules/onboarding/components/onboarding-shell.tsx
git commit -m "feat(onboarding): rewrite shell with new stepper"
```

---

### Task 4: Rewrite step-1-income-profile.tsx

**Files:**
- Write: `modules/onboarding/components/step-1-income-profile.tsx`

**Interfaces:**
- Produces: `Step1IncomeProfile` component. Receives `onNext: () => void` prop.

- [ ] **Step 1: Write the file**

```tsx
"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";
import type { IncomeModel } from "../types";

const OPTIONS: {
  value: IncomeModel;
  title: string;
  description: string;
}[] = [
  {
    value: "fixed",
    title: "Trabajador dependiente",
    description: "Sueldo fijo en fechas conocidas.",
  },
  {
    value: "variable",
    title: "Trabajador independiente",
    description: "Ingresos variables por proyecto o venta.",
  },
  {
    value: "mixed",
    title: "Ingresos mixtos",
    description: "Una parte fija y otra variable.",
  },
];

export function Step1IncomeProfile({ onNext }: { onNext: () => void }) {
  const { state, dispatch } = useOnboarding();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function handleSelect(value: IncomeModel) {
    dispatch({
      type: "UPDATE",
      payload: {
        incomeModel: value,
        payFrequency: value === "mixed" ? "monthly" : null,
        paydays: value === "mixed" ? [1] : [],
        cycleDurationDays: value === "variable" ? 30 : null,
      },
    });
  }

  return (
    <OnboardingShell
      currentStep={1}
      title="¿Cómo recibes tu dinero?"
      subtitle="Con esto Quipu arma tu ciclo. Podrás cambiarlo después."
      cta={
        <Button
          onClick={onNext}
          disabled={!state.incomeModel}
          size="lg"
        >
          Continuar →
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const selected = state.incomeModel === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(opt.value)}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-colors ${
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-qp-border bg-white">
                {opt.value === "fixed" && (
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <rect x="2" y="2" width="16" height="16" rx="4" fill="currentColor" className="text-primary" />
                  </svg>
                )}
                {opt.value === "variable" && (
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="3" className="text-clay" />
                  </svg>
                )}
                {opt.value === "mixed" && (
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <rect x="2" y="2" width="7" height="16" rx="2" fill="currentColor" className="text-needs" />
                    <rect x="11" y="2" width="7" height="16" rx="2" fill="currentColor" className="text-clay" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{opt.title}</p>
                <p className="text-sm text-muted-foreground">{opt.description}</p>
              </div>
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                  selected ? "bg-primary" : "border-2 border-border"
                }`}
              >
                {selected && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path
                      d="M1 3l2 2 4-4"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add modules/onboarding/components/step-1-income-profile.tsx
git commit -m "feat(onboarding): step 1 — income profile selection"
```

---

### Task 5: Rewrite step-2-system-config.tsx

**Files:**
- Write: `modules/onboarding/components/step-2-system-config.tsx`

**Interfaces:**
- Produces: `Step2SystemConfig` with `onBack` and `onNext` props
- Three branches: fixed (frequency + day pills), variable (15/30 cards), mixed (fixed part + variable tags)

- [ ] **Step 1: Write the file**

```tsx
"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";

const DAY_PILLS = [15, 30, "Ultimo"] as const;
const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatCycle(day: number): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), day);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return `${start.getDate()} ${MONTHS[start.getMonth()]} → ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}

export function Step2SystemConfig({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const { state, dispatch } = useOnboarding();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // --- Variable income branch ---
  if (state.incomeModel === "variable") {
    return (
      <OnboardingShell
        currentStep={2}
        title="¿Cómo prefieres tus ciclos?"
        subtitle="Como tus ingresos varían, Quipu trabaja por ciclos fijos y reparte lo que va entrando."
        onBack={onBack}
        cta={
          <Button
            onClick={onNext}
            disabled={!state.cycleDurationDays}
            size="lg"
          >
            Continuar →
          </Button>
        }
      >
        <div className="flex gap-3">
          {[15, 30].map((days) => {
            const selected = state.cycleDurationDays === days;
            return (
              <button
                key={days}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() =>
                  dispatch({
                    type: "UPDATE",
                    payload: { cycleDurationDays: days as 15 | 30 },
                  })
                }
                className={`flex flex-1 flex-col rounded-xl border-2 p-5 text-left ${
                  selected
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <p className="font-serif text-2xl text-foreground">{days} días</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {days === 15
                    ? "Ciclos cortos, ideal si cobras seguido."
                    : "Un mes completo para ver el panorama."}
                </p>
                <span
                  className={`mt-3 flex size-5 items-center justify-center rounded-full self-start ${
                    selected ? "bg-primary" : "border-2 border-border"
                  }`}
                >
                  {selected && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path
                        d="M1 3l2 2 4-4"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-soft p-4 text-sm text-muted-foreground">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
            i
          </span>
          <p>
            Cada ingreso que registres se reparte en tus sobres según tu
            porcentaje. Si un ciclo entra poco, Quipu te avisa con calma.
          </p>
        </div>
      </OnboardingShell>
    );
  }

  // --- Mixed income branch ---
  if (state.incomeModel === "mixed") {
    const mixedDay = state.paydays?.[0] ?? 1;
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
          {/* Fixed part */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="size-3 rounded-full bg-needs" />
              <p className="font-semibold">Ingreso previsible</p>
              <span className="text-xs text-muted-foreground">· sueldo, mensualidad</span>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground">Monto</p>
                <p className="font-serif text-xl text-foreground">S/ —</p>
              </div>
              <div className="flex-1 rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground">Día de pago</p>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_PILLS.map((d) => {
                    const day = d === "Ultimo" ? 31 : d;
                    const selected = mixedDay === day;
                    return (
                      <button
                        key={String(d)}
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: "UPDATE",
                            payload: { paydays: [day] },
                          })
                        }
                        className={`rounded-lg border px-3 py-1.5 text-sm ${
                          selected
                            ? "border-primary bg-primary-soft font-semibold text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Variable part */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="size-3 rounded-full bg-clay" />
              <p className="font-semibold">Ingresos variables</p>
              <span className="text-xs text-muted-foreground">· proyectos, ventas</span>
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

  // --- Fixed income branch (default) ---
  const isBiweekly = state.payFrequency === "biweekly";
  const cycleDays = isBiweekly ? 15 : 30;
  const payday = state.paydays?.[0] ?? 1;
  const preview = formatCycle(payday);
  const canContinue = state.payFrequency && state.paydays && state.paydays.length > 0;

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
      {/* Frequency toggle */}
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
              className={`flex flex-1 items-center justify-between rounded-xl border-2 p-5 text-left ${
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div>
                <p className="font-semibold">
                  {freq === "monthly" ? "Mensual" : "Quincenal"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {freq === "monthly" ? "Un pago al mes" : "Dos pagos al mes"}
                </p>
              </div>
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                  selected ? "bg-primary" : "border-2 border-border"
                }`}
              >
                {selected && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path
                      d="M1 3l2 2 4-4"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day pill selector */}
      <p className="text-sm font-medium">Día de pago</p>
      <div className="flex flex-wrap gap-2">
        {DAY_PILLS.map((d) => {
          const day = d === "Ultimo" ? 31 : d;
          const selected = state.paydays?.includes(day);
          return (
            <button
              key={String(d)}
              type="button"
              onClick={() => {
                if (isBiweekly) {
                  const other = state.paydays?.find((pd) => pd !== (state.paydays?.[0] ?? 1)) ?? 15;
                  if (day === other) return;
                  dispatch({ type: "UPDATE", payload: { paydays: [day, other] } });
                } else {
                  dispatch({ type: "UPDATE", payload: { paydays: [day] } });
                }
              }}
              className={`rounded-lg border px-4 py-2 text-sm ${
                selected
                  ? "border-primary bg-primary-soft font-semibold text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Cycle preview */}
      {state.paydays && state.paydays.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-soft p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tu ciclo
          </span>
          <span className="font-serif text-base text-foreground">{preview}</span>
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

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add modules/onboarding/components/step-2-system-config.tsx
git commit -m "feat(onboarding): step 2 — contextual system config"
```

---

### Task 6: Rewrite step-3-allocation.tsx

**Files:**
- Write: `modules/onboarding/components/step-3-allocation.tsx`

**Interfaces:**
- Produces: `Step3Allocation` with `onBack` and `onComplete` props
- Uses `completeOnboardingAction` server action via `useTransition`

- [ ] **Step 1: Write the file**

```tsx
"use client";

import { useRef, useEffect, useTransition } from "react";
import { Button } from "@/shared/components/ui/button";
import { OnboardingShell } from "./onboarding-shell";
import { useOnboarding } from "./onboarding-provider";
import { completeOnboardingAction } from "../actions";

type Envelope = "allocationNeeds" | "allocationWants" | "allocationSavings";

const ENVELOPES: {
  key: Envelope;
  label: string;
  desc: string;
  barColor: string;
}[] = [
  {
    key: "allocationNeeds",
    label: "Necesidades",
    desc: "Alquiler, servicios, comida",
    barColor: "bg-needs",
  },
  {
    key: "allocationWants",
    label: "Gustos",
    desc: "Salidas, antojos, suscripciones",
    barColor: "bg-clay",
  },
  {
    key: "allocationSavings",
    label: "Ahorro",
    desc: "Fondo de emergencia y metas",
    barColor: "bg-moss",
  },
];

export function Step3Allocation({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: () => void;
}) {
  const { state, dispatch } = useOnboarding();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const total =
    state.allocationNeeds + state.allocationWants + state.allocationSavings;

  function adjust(key: Envelope, delta: number) {
    const current = state[key];
    const newVal = Math.max(0, Math.min(100, current + delta));
    if (newVal === current) return;

    const others = ENVELOPES.filter((e) => e.key !== key).map((e) => e.key);
    const other1 = state[others[0]!];
    const other2 = state[others[1]!];
    const diff = newVal - current;

    let n1: number;
    let n2: number;

    if (other1 > 0 && other2 > 0) {
      const ratio = other1 / (other1 + other2);
      const adjust1 = Math.round(diff * ratio);
      n1 = Math.max(0, other1 - adjust1);
      n2 = Math.max(0, other2 - (diff - adjust1));
    } else if (other1 > 0) {
      n1 = Math.max(0, other1 - diff);
      n2 = other2;
    } else {
      n1 = other1;
      n2 = Math.max(0, other2 - diff);
    }

    dispatch({
      type: "UPDATE",
      payload: { [key]: newVal, [others[0]!]: n1, [others[1]!]: n2 },
    });
  }

  function handleSubmit() {
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
        <Button
          onClick={handleSubmit}
          disabled={total !== 100 || isPending}
          size="lg"
        >
          {isPending ? "Creando sistema…" : "Crear mi sistema →"}
        </Button>
      }
    >
      {/* Segmented bar */}
      <div className="flex h-4 overflow-hidden rounded-lg ring-1 ring-inset ring-black/5">
        <div
          className="bg-needs transition-all"
          style={{ width: `${state.allocationNeeds}%` }}
        />
        <div
          className="bg-clay transition-all"
          style={{ width: `${state.allocationWants}%` }}
        />
        <div
          className="bg-moss transition-all"
          style={{ width: `${state.allocationSavings}%` }}
        />
      </div>

      {/* Allocation rows */}
      <div className="flex flex-col gap-3">
        {ENVELOPES.map((env) => {
          const value = state[env.key];
          return (
            <div key={env.key} className="flex items-center gap-4">
              <span className={`size-3 shrink-0 rounded-full ${env.barColor}`} />
              <div className="flex-1">
                <p className="font-semibold">{env.label}</p>
                <p className="text-xs text-muted-foreground">{env.desc}</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-1">
                <button
                  type="button"
                  onClick={() => adjust(env.key, -5)}
                  className="flex size-7 items-center justify-center rounded-md bg-surface text-muted-foreground hover:text-foreground"
                  aria-label={`Reducir ${env.label}`}
                >
                  −
                </button>
                <span className="font-serif min-w-[3rem] text-center text-lg text-foreground">
                  {value}%
                </span>
                <button
                  type="button"
                  onClick={() => adjust(env.key, 5)}
                  className="flex size-7 items-center justify-center rounded-md bg-surface text-muted-foreground hover:text-foreground"
                  aria-label={`Aumentar ${env.label}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation feedback */}
      {total === 100 ? (
        <div className="flex items-center gap-2 text-sm text-primary">
          <span className="flex size-4 items-center justify-center rounded-full bg-primary-soft">
            <svg width="6" height="5" viewBox="0 0 6 5" fill="none">
              <path
                d="M1 2.5l1.5 1.5 2.5-3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Suma 100% · listo
        </div>
      ) : (
        <div
          className="rounded-lg bg-danger-bg p-3 text-sm text-danger-ink"
          role="alert"
        >
          El reparto suma {total}%. Ajusta para que sea exactamente 100% antes
          de continuar.
        </div>
      )}
    </OnboardingShell>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add modules/onboarding/components/step-3-allocation.tsx
git commit -m "feat(onboarding): step 3 — allocation 50/30/20"
```

---

### Task 7: Create step-success.tsx

**Files:**
- Create: `modules/onboarding/components/step-success.tsx`

**Interfaces:**
- Consumes: `useOnboarding` hook for display values (incomeModel label, payFrequency, allocations)
- Produces: `StepSuccess` component with summary cards + "Entrar a Quipu" CTA

- [ ] **Step 1: Write the file**

```tsx
"use client";

import { useOnboarding } from "./onboarding-provider";
import { redirectToDashboard } from "../actions";

const MODEL_LABELS: Record<string, string> = {
  fixed: "Dependiente",
  variable: "Independiente",
  mixed: "Mixto",
};

const FREQ_LABELS: Record<string, string> = {
  monthly: "Mensual",
  biweekly: "Quincenal",
};

export function StepSuccess() {
  const { state } = useOnboarding();

  const cycleLabel = state.incomeModel === "variable"
    ? `Variable · ${state.cycleDurationDays} días`
    : `${FREQ_LABELS[state.payFrequency ?? "monthly"]} · día ${state.paydays?.[0] ?? 1}`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-4 py-12">
      {/* Check circle */}
      <div className="flex size-16 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
          <path
            d="M2 9l7 7L22 3"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold">
          Tu sistema está listo
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Así queda tu Quipu. Todo esto lo puedes ajustar cuando quieras.
        </p>
      </div>

      {/* Summary cards */}
      <div className="flex w-full gap-3">
        <div className="flex-1 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Perfil
          </p>
          <p className="mt-2 font-semibold">
            {MODEL_LABELS[state.incomeModel ?? "fixed"]}
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ciclo
          </p>
          <p className="mt-2 font-semibold">{cycleLabel}</p>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reparto
          </p>
          <div className="mt-2 flex items-center gap-1.5 font-semibold">
            <span className="flex gap-0.5">
              <span className="size-2 rounded-full bg-needs" />
              <span className="size-2 rounded-full bg-clay" />
              <span className="size-2 rounded-full bg-moss" />
            </span>
            {state.allocationNeeds}/{state.allocationWants}/{state.allocationSavings}
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={() => redirectToDashboard()}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Entrar a Quipu →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Update actions.ts to add redirectToDashboard**

The `actions.ts` file needs the `redirectToDashboard` function. Read current `actions.ts` and add:

```ts
export async function redirectToDashboard() {
  redirect("/dashboard");
}
```

At the bottom, and ensure `import { redirect } from "next/navigation";` is at top.

- [ ] **Step 3: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add modules/onboarding/components/step-success.tsx modules/onboarding/actions.ts
git commit -m "feat(onboarding): success screen and dashboard redirect"
```

---

### Task 8: Rewrite onboarding-wizard.tsx (orchestrator)

**Files:**
- Write: `modules/onboarding/components/onboarding-wizard.tsx`

**Interfaces:**
- Consumes: `OnboardingProvider`, all 3 step components, `StepSuccess`
- Produces: `OnboardingWizard` default export for page.tsx
- Internal: `useState<1 | 2 | 3 | "success">` for step tracking. No URL effects.

- [ ] **Step 1: Write the file**

```tsx
"use client";

import { useState } from "react";
import { OnboardingProvider } from "./onboarding-provider";
import { Step1IncomeProfile } from "./step-1-income-profile";
import { Step2SystemConfig } from "./step-2-system-config";
import { Step3Allocation } from "./step-3-allocation";
import { StepSuccess } from "./step-success";

export function OnboardingWizard() {
  return (
    <OnboardingProvider>
      <WizardInner />
    </OnboardingProvider>
  );
}

function WizardInner() {
  const [step, setStep] = useState<1 | 2 | 3 | "success">(1);

  function handleNext() {
    setStep((s) => {
      if (s === 1) return 2;
      if (s === 2) return 3;
      return s;
    });
  }

  function handleBack() {
    setStep((s) => {
      if (s === 2) return 1;
      if (s === 3) return 2;
      return s;
    });
  }

  function handleComplete() {
    setStep("success");
  }

  if (step === "success") return <StepSuccess />;

  switch (step) {
    case 1:
      return <Step1IncomeProfile onNext={handleNext} />;
    case 2:
      return <Step2SystemConfig onBack={handleBack} onNext={handleNext} />;
    case 3:
      return <Step3Allocation onBack={handleBack} onComplete={handleComplete} />;
    default:
      return <Step1IncomeProfile onNext={handleNext} />;
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add modules/onboarding/components/onboarding-wizard.tsx
git commit -m "feat(onboarding): wizard orchestrator with internal state"
```

---

### Task 9: Verify types, constants, schemas, actions, and page

**Files:**
- Verify: `modules/onboarding/types.ts`
- Verify: `modules/onboarding/constants.ts`
- Verify: `modules/onboarding/schemas.ts`
- Verify: `modules/onboarding/actions.ts`
- Verify: `app/(onboarding)/configurar/page.tsx`

**Interfaces:**
- All files must typecheck together with the rewritten components

- [ ] **Step 1: Verify types.ts**

Current state is correct:
```ts
export type IncomeModel = "fixed" | "variable" | "mixed";
export type PayFrequency = "monthly" | "biweekly";
export type CycleDuration = 15 | 30;
// OnboardingState with all fields, OnboardingAction with UPDATE|RESET|HYDRATE
```

Verify `OnboardingAction` type no longer has `SET_STEP` (wizard handles step internally):
```ts
export type OnboardingAction =
  | { type: "UPDATE"; payload: Partial<OnboardingState> }
  | { type: "RESET" }
  | { type: "HYDRATE"; payload: Partial<OnboardingState> };
```

- [ ] **Step 2: Verify constants.ts** — should have STEP_COUNT, STEP_LABELS, ONBOARDING_DEFAULTS, STORAGE_KEY. Current is correct.

- [ ] **Step 3: Verify schemas.ts** — remove unused `step1Schema`, `step2Schema` (validation is inline in components). Keep only `finalPayloadSchema` used by action. But Zod schemas are useful for validation — keep them, remove `required_error` from `step1Schema` which uses `z.enum` (doesn't support it). Already fixed to `z.enum(["fixed", "variable", "mixed"])`.

- [ ] **Step 4: Verify actions.ts** — ensure `completeOnboardingAction` uses `finalPayloadSchema` correctly, passes to `api.profiles.createProfile`, and has `redirectToDashboard`.
```ts
"use server";
import { redirect } from "next/navigation";
import { fetchAuthMutation } from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { fromConvexError } from "@/core/errors";
import { finalPayloadSchema } from "./schemas";
import { ONBOARDING_DEFAULTS } from "./constants";

export async function completeOnboardingAction(input: unknown) {
  const parsed = finalPayloadSchema.parse({
    ...ONBOARDING_DEFAULTS,
    ...(input as object),
  });
  try {
    await fetchAuthMutation(api.profiles.createProfile, parsed);
  } catch (error) {
    throw fromConvexError(error);
  }
}

export async function redirectToDashboard() {
  redirect("/dashboard");
}
```

- [ ] **Step 5: Verify page.tsx** — current state is correct:
```tsx
import { redirect } from "next/navigation";
import { fetchAuthQuery } from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { OnboardingWizard } from "@/modules/onboarding/components/onboarding-wizard";

export default async function ConfigurarPage() {
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (profile) redirect("/dashboard");
  return <OnboardingWizard />;
}
```

- [ ] **Step 6: Full typecheck**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Lint check (onboarding files only)**

```bash
pnpm lint
```
Expected: no new errors from `modules/onboarding/`. Pre-existing errors (convex/_generated, etc.) are documented in P2-6 of pending work.

- [ ] **Step 8: Commit**

```bash
git add modules/onboarding/types.ts modules/onboarding/constants.ts modules/onboarding/schemas.ts modules/onboarding/actions.ts app/(onboarding)/configurar/page.tsx
git commit -m "chore(onboarding): verify and finalize data layer and route"
```

---

### Task 10: Update spec document

**Files:**
- Write: `docs/superpowers/specs/2026-07-07-onboarding-design.md` (replace with updated design reflecting HTML)

**Do:** Replace spec content with a short note referencing `quipu-2.html` as the canonical design and summarizing the 3-step flow.

- [ ] **Step 1: Write updated spec**

```markdown
# Onboarding v3.0 — Diseño

**Fecha:** 2026-07-17
**Estado:** Implementado
**Diseño visual:** `quipu-2.html` lines 381-635 (Bloque 2 · Onboarding)

## Resumen

Wizard de 3 pasos inspirado en `quipu-2.html`. El usuario define cómo recibe su dinero, configura su sistema (contextual según su modelo de ingresos), y establece su reparto 50/30/20.

### Paso 1 — Perfil: "¿Cómo recibes tu dinero?"
- 3 radio cards: Trabajador dependiente (sueldo fijo) / Trabajador independiente (ingresos variables) / Ingresos mixtos (fijo + variable)
- Mapea a `incomeModel: "fixed" | "variable" | "mixed"`

### Paso 2 — Sistema: Configuración contextual
- **Dependiente:** "¿Cada cuánto te pagan?" — Mensual/Quincenal + día de pago (15, 30, Último, Otro…) + preview del ciclo
- **Independiente:** "¿Cómo prefieres tus ciclos?" — 15 días o 30 días
- **Mixto:** "Combinemos lo fijo y lo variable" — monto + día de pago parte fija + tags variables

### Paso 3 — Reparto: "¿Cómo repartes lo que entra?"
- Barra segmentada + 3 filas con controles -/+ (5% incrementos)
- Defaults: 50/30/20
- CTA: "Crear mi sistema →" llama a `createProfile`

### Pantalla de éxito
- "Tu sistema está listo" con 3 cards resumen (Perfil, Ciclo, Reparto)
- "Entrar a Quipu →" redirige a `/dashboard`

## Decisiones técnicas

| Decisión | Razón |
|---|---|
| **Sin URL state machine** | Estado interno vía `useState`. Sin `?step=`, sin `window.history`. Más simple, menos bugs. |
| **3 pasos (no 8)** | Diseño del HTML final. Cada paso responde UNA pregunta. |
| **Sin captura de `name`** | El nombre viene del sign-up (Better Auth). `createProfile` lo toma de `identity.name` como fallback. |
| **Sin paso de compromisos** | Los compromisos fijos se agregan desde el dashboard, no en onboarding. |
| **`cycleDurationDays` en schema** | Campo nuevo para que variable income elija entre 15 o 30 días de ciclo. |
| **Server action directa** | `completeOnboardingAction` llama `createProfile` y la mutation maneja el redirect nativo. |
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-07-07-onboarding-design.md
git commit -m "docs(onboarding): update spec to v3.0 3-step design"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 3 steps from `quipu-2.html` are covered (step 1, 2 with 3 branches, 3). Success screen exists. Backend changes (cycleDurationDays, name optional) are included.
- [x] **Placeholder scan:** No TBD, TODO, "implement later" in any task. All code is explicit.
- [x] **Type consistency:** `OnboardingAction` no longer has `SET_STEP`. `Step1IncomeProfile` receives `onNext`, `Step2SystemConfig` receives `onBack`/`onNext`, `Step3Allocation` receives `onBack`/`onComplete`. `OnboardingWizard` manages step via `useState`. All types match.
- [x] **No URL effects:** Verified. No `useRouter` in step components, no `useSearchParams`, no `window.history`, no `?step=` params.
- [x] **Schema consistency:** `cycleDurationDays` in schema, in profiles.ts args, in profiles.ts insert. `name` optional with `identity.name` fallback.
