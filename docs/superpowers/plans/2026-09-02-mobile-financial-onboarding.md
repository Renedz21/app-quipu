# Onboarding financiero móvil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intro educativa + wizard "Tu sistema" (perfil → sistema → reparto → compromisos → confirmación → éxito) en `apps/mobile`, reutilizando Convex sin cambios de backend.

**Architecture:** Nuevo route group `app/(onboarding)/` con dos rutas (`index` = intro, `sistema` = wizard de pasos internos). Gate client-side `OnboardingGate` (sesión + `profiles.getMyProfile`) reemplaza `AuthGate` en `(tabs)`. Lógica pura portada de la web a `shared/lib/onboarding/`; estado del wizard en `modules/onboarding/` con Context + useReducer (sin persistencia).

**Tech Stack:** Expo SDK 57, expo-router, uniwind (Tailwind v4), `@tanstack/react-form` + zod, `convex/react` + `@quipu/convex-api`, Reanimated, Jest + jest-expo + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-09-02-mobile-financial-onboarding-design.md`

## Global Constraints

- **Cero cambios en `apps/web/convex/`** — solo consumo desde móvil vía `@quipu/convex-api`.
- Dinero SIEMPRE en céntimos (ints) en lógica/estado; soles solo en UI.
- Paydays nominales por default, NO se piden al usuario: `{ monthly: [1], biweekly: [15, 30], weekly: [1] }`.
- El monto "¿cuánto sueles recibir?" (`referenceIncomeCents`) es solo preview; nunca va al payload.
- Copys en español, sin emojis. Etiquetas small-caps: `font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase`.
- Títulos serif: `font-newsreader`. Cuerpo: `font-hanken` / `font-hanken-semibold`.
- CTA primario: `bg-foreground` (negro), radio `rounded-xl`, `h-[52px]`; CTA de acción clave (Empezar mi ciclo): `bg-primary`.
- forms: `@tanstack/react-form` + zod + `revalidateOnBlur` + `setFormError` (patrón de `app/(auth)/create-account.tsx`).
- Comandos (desde `apps/mobile`): `pnpm test`, `pnpm lint`, `pnpm typecheck` (o `npx tsc --noEmit`).
- Rama activa: `feat/mobile-financial-onboarding`.

---

### Task 1: Portar lógica pura — markets, schemas, allocation, payload

**Files:**
- Create: `apps/mobile/shared/lib/onboarding/markets.ts`
- Create: `apps/mobile/shared/lib/onboarding/types.ts`
- Create: `apps/mobile/shared/lib/onboarding/schemas.ts`
- Create: `apps/mobile/shared/lib/onboarding/allocation.ts`
- Create: `apps/mobile/shared/lib/onboarding/payload.ts`
- Create: `apps/mobile/shared/lib/onboarding/defaults.ts`
- Test: `apps/mobile/__tests__/lib/onboarding/payload.test.ts`
- Test: `apps/mobile/__tests__/lib/onboarding/allocation.test.ts`

**Interfaces:**
- Produces (los demás tasks consumen):
  - `SUPPORTED_MARKETS`, `DEFAULT_MARKET`, `marketFromCurrencyCode(code: string)` (de `markets.ts`)
  - `OnboardingState`, `WizardStep`, `IncomeModel`, `PayFrequency`, `DraftCommitment` (de `types.ts`)
  - `finalPayloadSchema` (zod, acepta `weekly`)
  - `distributeEnvelope(state, key, newValue)`, `ALLOCATION_DEFAULTS`
  - `PAYDAYS_BY_FREQUENCY`, `ONBOARDING_DEFAULTS`
  - `buildOnboardingPayload(input)` → payload validado de `profiles.createProfile`

- [ ] **Step 1: Crear `markets.ts`** (port de `apps/web/shared/constants/markets.ts`, solo lo necesario)

```ts
export type CurrencyCode = "PEN" | "EUR" | "USD";

export type SupportedMarket = {
  id: "pe" | "es" | "us";
  country: string;
  currencyCode: CurrencyCode;
  currencySymbol: string;
  locale: string;
};

export const SUPPORTED_MARKETS: readonly SupportedMarket[] = [
  { id: "pe", country: "Perú", currencyCode: "PEN", currencySymbol: "S/", locale: "es-PE" },
  { id: "es", country: "España", currencyCode: "EUR", currencySymbol: "€", locale: "es-ES" },
  { id: "us", country: "Estados Unidos", currencyCode: "USD", currencySymbol: "$", locale: "en-US" },
];

export const DEFAULT_MARKET: SupportedMarket = SUPPORTED_MARKETS[0];

export function marketFromCurrencyCode(code: string): SupportedMarket | undefined {
  return SUPPORTED_MARKETS.find((m) => m.currencyCode === code);
}

export function marketFromId(id: SupportedMarket["id"]): SupportedMarket | undefined {
  return SUPPORTED_MARKETS.find((m) => m.id === id);
}
```

- [ ] **Step 2: Crear `types.ts`**

```ts
export type IncomeModel = "fixed" | "variable" | "mixed";
export type PayFrequency = "monthly" | "biweekly" | "weekly";
export type WizardStep = 1 | 2 | 3 | 4 | "confirm" | "success";

export type DraftCommitment = {
  id: string;
  name: string;
  amountCents: number;
  dueDay: number;
};

export type OnboardingState = {
  step: WizardStep;
  incomeModel: IncomeModel | null;
  payFrequency: PayFrequency | null;
  /** Referencia visual, NUNCA se persiste (spec §4). */
  referenceIncomeCents: number | null;
  cycleDurationDays: 15 | 30 | undefined;
  mixedFixedAmountCents: number | undefined;
  variableIncomeSources: string[];
  allocationNeeds: number;
  allocationWants: number;
  allocationSavings: number;
  commitments: DraftCommitment[];
};

export type OnboardingAction =
  | { type: "UPDATE"; payload: Partial<OnboardingState> }
  | { type: "SET_STEP"; payload: WizardStep }
  | { type: "ADD_COMMITMENT"; payload: DraftCommitment }
  | { type: "REMOVE_COMMITMENT"; payload: string }
  | { type: "UPDATE_COMMITMENT"; payload: DraftCommitment }
  | { type: "RESET" };
```

- [ ] **Step 3: Crear `defaults.ts`**

```ts
import { DEFAULT_MARKET } from "./markets";
import type { OnboardingState, PayFrequency } from "./types";

export const ONBOARDING_DEFAULTS: OnboardingState = {
  step: 1,
  incomeModel: null,
  payFrequency: null,
  referenceIncomeCents: null,
  cycleDurationDays: undefined,
  mixedFixedAmountCents: undefined,
  variableIncomeSources: [],
  allocationNeeds: 50,
  allocationWants: 30,
  allocationSavings: 20,
  commitments: [],
};

export const PAYDAYS_BY_FREQUENCY: Record<PayFrequency, number[]> = {
  monthly: [1],
  biweekly: [15, 30],
  weekly: [1],
};

export const FREQ_OPTIONS: { value: PayFrequency; label: string }[] = [
  { value: "monthly", label: "Mensual" },
  { value: "biweekly", label: "Quincenal" },
  { value: "weekly", label: "Semanal" },
];

export const FREQ_DRIFT_COPY: Record<PayFrequency, string> = {
  monthly: "El día de pago es una referencia. Si tu pago real llega antes o después, el ciclo se ajusta a la fecha en que registres tu ingreso.",
  biweekly: "Pagado a medio y fin de mes. Si tu pago real llega antes o después (feriados, fines de semana), el ciclo se ajusta a la fecha en que registres tu ingreso.",
  weekly: "El día de pago es una referencia. El ciclo se ajusta a la fecha en que registres tu ingreso.",
};
```

- [ ] **Step 4: Crear `schemas.ts`** (port del web; `payFrequency` incluye `weekly`)

```ts
import { z } from "zod";
import { DEFAULT_MARKET } from "./markets";

const currencyCodes = SUPPORTED_MARKETS.map((m) => m.currencyCode) as ["PEN", "EUR", "USD"];
import { SUPPORTED_MARKETS } from "./markets";

export const finalPayloadSchema = z
  .object({
    name: z.string().optional(),
    country: z.string().default(DEFAULT_MARKET.country),
    currencyCode: z.enum(currencyCodes).default(DEFAULT_MARKET.currencyCode),
    currencySymbol: z.string().default(DEFAULT_MARKET.currencySymbol),
    incomeModel: z.enum(["fixed", "variable", "mixed"]),
    payFrequency: z.enum(["monthly", "biweekly", "weekly"]).optional(),
    paydays: z.array(z.number().int().min(1).max(31)).optional(),
    cycleDurationDays: z.union([z.literal(15), z.literal(30)]).optional(),
    mixedFixedAmount: z.number().int().min(0).optional(),
    variableIncomeSources: z.array(z.string().trim().min(1).max(30)).optional(),
    allocationNeeds: z.number().int().min(0).max(100),
    allocationWants: z.number().int().min(0).max(100),
    allocationSavings: z.number().int().min(0).max(100),
  })
  .refine(
    (d) => d.allocationNeeds + d.allocationWants + d.allocationSavings === 100,
    { message: "El reparto debe sumar exactamente 100%.", path: ["allocations"] },
  )
  .superRefine((data, ctx) => {
    if (data.incomeModel === "variable") {
      if (data.cycleDurationDays == null) {
        ctx.addIssue({ code: "custom", path: ["cycleDurationDays"], message: "Para ingresos variables, elige un ciclo de 15 o 30 días." });
      }
      if (data.payFrequency !== undefined) {
        ctx.addIssue({ code: "custom", path: ["payFrequency"], message: "Para ingresos variables, payFrequency no aplica." });
      }
      return;
    }
    if (!data.payFrequency) {
      ctx.addIssue({ code: "custom", path: ["payFrequency"], message: "Para ingresos fijos o mixtos, payFrequency y paydays son obligatorios." });
    }
    if (!data.paydays || data.paydays.length === 0) {
      ctx.addIssue({ code: "custom", path: ["paydays"], message: "Para ingresos fijos o mixtos, payFrequency y paydays son obligatorios." });
    }
  });
```

(Nota: mover el `import { SUPPORTED_MARKETS }` arriba con el resto de imports.)

- [ ] **Step 5: Crear `allocation.ts`** (port 1:1 de `apps/web/modules/onboarding/lib/allocation.ts`, sin depender de `types.ts` de la web — usar `Pick<OnboardingState, ...>` de `./types`)

```ts
import type { OnboardingState } from "./types";

type Allocation = Pick<OnboardingState, "allocationNeeds" | "allocationWants" | "allocationSavings">;

const KEYS = ["allocationNeeds", "allocationWants", "allocationSavings"] as const;
type AllocationKey = (typeof KEYS)[number];

export function distributeEnvelope(state: Allocation, key: AllocationKey, newValue: number): Allocation {
  const clamped = Math.max(0, Math.min(100, newValue));
  if (clamped === state[key]) return state;
  const others = KEYS.filter((k) => k !== key);
  const first = others[0];
  const second = others[1];
  if (first === undefined || second === undefined) return state;
  const o1 = state[first];
  const o2 = state[second];
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
  return { ...state, [key]: clamped, [first]: n1, [second]: n2 };
}

export const ALLOCATION_DEFAULTS: Allocation = {
  allocationNeeds: 50,
  allocationWants: 30,
  allocationSavings: 20,
};

export type { Allocation, AllocationKey };
```

- [ ] **Step 6: Escribir tests fallando** `__tests__/lib/onboarding/payload.test.ts`

```ts
import { buildOnboardingPayload } from "@/shared/lib/onboarding/payload";
import { PAYDAYS_BY_FREQUENCY } from "@/shared/lib/onboarding/defaults";

describe("buildOnboardingPayload", () => {
  const base = {
    incomeModel: "fixed",
    payFrequency: "biweekly",
    allocationNeeds: 50,
    allocationWants: 30,
    allocationSavings: 20,
  };

  it("fija paydays nominales según frecuencia y completa mercado default", () => {
    const payload = buildOnboardingPayload({ ...base, referenceIncomeCents: 350000 });
    expect(payload.paydays).toEqual(PAYDAYS_BY_FREQUENCY.biweekly);
    expect(payload.country).toBe("Perú");
    expect(payload.currencyCode).toBe("PEN");
    expect(payload.currencySymbol).toBe("S/");
  });

  it("excluye referenceIncomeCents y paydays custom del wizard", () => {
    const payload = buildOnboardingPayload({ ...base, paydays: [24] });
    expect(payload.paydays).toEqual([15, 30]);
    expect("referenceIncomeCents" in payload).toBe(false);
  });

  it("variable: exige cycleDurationDays, elimina payFrequency/paydays", () => {
    const payload = buildOnboardingPayload({
      incomeModel: "variable",
      cycleDurationDays: 15,
      variableIncomeSources: ["Freelance"],
      allocationNeeds: 50,
      allocationWants: 30,
      allocationSavings: 20,
    });
    expect(payload.payFrequency).toBeUndefined();
    expect(payload.cycleDurationDays).toBe(15);
    expect(() =>
      buildOnboardingPayload({
        incomeModel: "variable",
        allocationNeeds: 50, allocationWants: 30, allocationSavings: 20,
      }),
    ).toThrow();
  });

  it("mixed: exige payFrequency y mixedFixedAmount", () => {
    const payload = buildOnboardingPayload({
      incomeModel: "mixed",
      payFrequency: "monthly",
      mixedFixedAmount: 200000,
      variableIncomeSources: ["Proyectos"],
      allocationNeeds: 50, allocationWants: 30, allocationSavings: 20,
    });
    expect(payload.payFrequency).toBe("monthly");
    expect(payload.mixedFixedAmount).toBe(200000);
  });

  it("rechaza allocations que no suman 100", () => {
    expect(() =>
      buildOnboardingPayload({ ...base, allocationSavings: 19 }),
    ).toThrow();
  });

  it("name opcional pasa al payload", () => {
    const payload = buildOnboardingPayload({ ...base, name: "Edzon" });
    expect(payload.name).toBe("Edzon");
  });
});
```

`__tests__/lib/onboarding/allocation.test.ts` — portar casos de `apps/web/modules/onboarding/lib/__tests__/` (distribución proporcional, clamps a 0/100, mismo valor no-op).

- [ ] **Step 7: Crear `payload.ts`**

```ts
import { PAYDAYS_BY_FREQUENCY } from "./defaults";
import { marketFromCurrencyCode, marketFromId } from "./markets";
import { finalPayloadSchema } from "./schemas";
import type { PayFrequency } from "./types";

const PROFILE_PAYLOAD_KEYS = [
  "name", "country", "currencyCode", "currencySymbol",
  "incomeModel", "payFrequency", "paydays", "cycleDurationDays",
  "mixedFixedAmount", "variableIncomeSources",
  "allocationNeeds", "allocationWants", "allocationSavings",
] as const;

type ProfilePayloadKey = (typeof PROFILE_PAYLOAD_KEYS)[number];

function isPresent(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * Normaliza el estado del wizard al payload de `profiles.createProfile`.
 * Los paydays son SIEMPRE nominales por frecuencia (spec: el usuario no los
 * elige; el ciclo real se ancla a la fecha del ingreso registrado).
 */
export function buildOnboardingPayload(input: unknown) {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...raw };

  const market =
    (typeof merged.marketId === "string"
      ? marketFromId(merged.marketId as "pe" | "es" | "us")
      : undefined) ??
    marketFromCurrencyCode(typeof merged.currencyCode === "string" ? merged.currencyCode : "") ??
    (() => {
      const m = DEFAULT_MARKET;
      return m;
    })();

  if (market) {
    merged.country = market.country;
    merged.currencyCode = market.currencyCode;
    merged.currencySymbol = market.currencySymbol;
  }

  if (typeof merged.payFrequency === "string" && merged.payFrequency in PAYDAYS_BY_FREQUENCY) {
    merged.paydays = PAYDAYS_BY_FREQUENCY[merged.payFrequency as PayFrequency];
  }
  if (merged.mixedFixedAmountCents != null) {
    merged.mixedFixedAmount = merged.mixedFixedAmountCents;
  }

  const picked: Record<string, unknown> = {};
  for (const key of PROFILE_PAYLOAD_KEYS) {
    const value = merged[key as ProfilePayloadKey];
    if (isPresent(value)) picked[key] = value;
  }

  if (picked.incomeModel === "variable") {
    delete picked.payFrequency;
    delete picked.paydays;
    delete picked.mixedFixedAmount;
  }
  if (picked.incomeModel === "fixed") {
    delete picked.cycleDurationDays;
    delete picked.mixedFixedAmount;
    delete picked.variableIncomeSources;
  }

  return finalPayloadSchema.parse(picked);
}
```

(Nota: importar `DEFAULT_MARKET` desde `./markets`; simplificar el fallback a `marketFromCurrencyCode(...) ?? DEFAULT_MARKET`.)

- [ ] **Step 8: Correr tests** — `cd apps/mobile && pnpm test __tests__/lib/onboarding` → PASS.
- [ ] **Step 9: Commit** — `git add -A && git commit -m "feat(mobile): port onboarding core logic (markets, schemas, allocation, payload)"`

---

### Task 2: `estimateDailyAvailable` + formato de dinero

**Files:**
- Create: `apps/mobile/shared/lib/onboarding/daily.ts`
- Test: `apps/mobile/__tests__/lib/onboarding/daily.test.ts`

**Interfaces:**
- Consumes: nada externo.
- Produces:
  - `estimateDailyAvailable(input: { referenceIncomeCents: number; commitmentsTotalCents: number; allocationNeeds: number; allocationWants: number; allocationSavings: number; cycleDays: number }): number | null` — `null` si el resultado es negativo (mostrar 0 con aviso en UI) o inputs inválidos.
  - `CYCLE_DAYS_BY_FREQUENCY = { monthly: 30, biweekly: 15, weekly: 7, variable15: 15, variable30: 30 }` (alineado con `CYCLE_DAYS` de `convex/lib/budgetMath.ts`).
  - `formatSoles(cents: number, symbol = "S/"): string` — separador de miles, 2 decimales ("S/ 3,500.00" → para montos grandes solo enteros: "S/ 3,500").
  - `formatDailyAvailable(cents: number, symbol = "S/"): string` — "S/ 42.30" (solo decimales si < 100 la parte decimal ≠ 0).

- [ ] **Step 1: Test fallando**

```ts
import { estimateDailyAvailable, formatSoles, formatDailyAvailable } from "@/shared/lib/onboarding/daily";

describe("estimateDailyAvailable", () => {
  // Contrato: floor a céntimo. (350000 - 126500 - 70000) / 30 = 5116.67 → 5116
  it("3500 soles, 1265 de compromisos, ahorro 20%, ciclo 30 → 5116", () => {
    const r = estimateDailyAvailable({
      referenceIncomeCents: 350000,
      commitmentsTotalCents: 126500,
      allocationNeeds: 50, allocationWants: 30, allocationSavings: 20,
      cycleDays: 30,
    });
    expect(r).toBe(5116);
  });
  it("retorna null sin ingreso de referencia", () => {
    expect(estimateDailyAvailable({ referenceIncomeCents: 0, commitmentsTotalCents: 0, allocationNeeds: 50, allocationWants: 30, allocationSavings: 20, cycleDays: 30 })).toBeNull();
  });
});
```

`formatSoles(350000) === "S/ 3,500"` · `formatSoles(96100) === "S/ 961"` · `formatDailyAvailable(4230) === "S/ 42.30"`.

- [ ] **Step 2: Implementar** `daily.ts`

```ts
export const CYCLE_DAYS_BY_FREQUENCY = {
  monthly: 30, biweekly: 15, weekly: 7, variable15: 15, variable30: 30,
} as const;

export function estimateDailyAvailable(input: {
  referenceIncomeCents: number;
  commitmentsTotalCents: number;
  allocationNeeds: number;
  allocationWants: number;
  allocationSavings: number;
  cycleDays: number;
}): number | null {
  const { referenceIncomeCents, commitmentsTotalCents, allocationSavings, cycleDays } = input;
  if (!referenceIncomeCents || cycleDays <= 0) return null;
  const savingsCents = Math.floor((referenceIncomeCents * allocationSavings) / 100);
  const spendable = referenceIncomeCents - commitmentsTotalCents - savingsCents;
  if (spendable <= 0) return 0;
  return Math.floor(spendable / cycleDays);
}

export function formatSoles(cents: number, symbol = "S/"): string {
  const soles = cents / 100;
  const hasCents = cents % 100 !== 0;
  const formatted = soles.toLocaleString("es-PE", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

export function formatDailyAvailable(cents: number, symbol = "S/"): string {
  const soles = Math.floor(cents / 100);
  const rem = cents % 100;
  return rem === 0 ? `${symbol} ${soles}` : `${symbol} ${soles}.${String(rem).padStart(2, "0")}`;
}
```

- [ ] **Step 3: Tests PASS** → **Step 4: Commit** `feat(mobile): onboarding daily estimate + money format`

---

### Task 3: Estado del wizard — provider + reducer

**Files:**
- Create: `apps/mobile/modules/onboarding/onboarding-provider.tsx`
- Create: `apps/mobile/modules/onboarding/state.ts` (reducer puro)
- Test: `apps/mobile/__tests__/modules/onboarding/state.test.ts`

**Interfaces:**
- Consumes: `OnboardingState`, `OnboardingAction`, `ONBOARDING_DEFAULTS` (Task 1).
- Produces: `onboardingReducer(state, action)`, `useOnboarding(): { state: OnboardingState; dispatch: Dispatch<OnboardingAction> }`, `OnboardingProvider`.

- [ ] **Step 1: Test fallando** del reducer: `UPDATE` mergea, `SET_STEP` cambia, `ADD/REMOVE/UPDATE_COMMITMENT` por `id`, `RESET` vuelve a defaults.
- [ ] **Step 2: Implementar** `state.ts`:

```ts
import { ONBOARDING_DEFAULTS } from "@/shared/lib/onboarding/defaults";
import type { OnboardingAction, OnboardingState } from "@/shared/lib/onboarding/types";

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "UPDATE":
      return { ...state, ...action.payload };
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "ADD_COMMITMENT":
      return { ...state, commitments: [...state.commitments, action.payload] };
    case "REMOVE_COMMITMENT":
      return { ...state, commitments: state.commitments.filter((c) => c.id !== action.payload) };
    case "UPDATE_COMMITMENT":
      return {
        ...state,
        commitments: state.commitments.map((c) => (c.id === action.payload.id ? action.payload : c)),
      };
    case "RESET":
      return { ...ONBOARDING_DEFAULTS };
  }
}
```

`onboarding-provider.tsx`: Context + `useReducer(onboardingReducer, ONBOARDING_DEFAULTS)` + hook `useOnboarding` que lanza si falta el provider.

- [ ] **Step 3: Tests PASS** → **Step 4: Commit** `feat(mobile): onboarding wizard state (reducer + provider)`

---

### Task 4: `OnboardingGate` + routing `(onboarding)`

**Files:**
- Create: `apps/mobile/shared/components/auth/onboarding-gate.tsx`
- Create: `apps/mobile/app/(onboarding)/_layout.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (registrar grupo)
- Modify: `apps/mobile/app/(tabs)/_layout.tsx` (reemplazar `AuthGate` por `OnboardingGate`)
- Modify: `apps/mobile/app/(auth)/sign-in.tsx` y `create-account.tsx` (redirects con sesión → destino según profile; el botón "Configurar mi sistema" → `/(onboarding)/sistema`)
- Test: `apps/mobile/__tests__/components/auth/onboarding-gate.test.tsx`

**Interfaces:**
- Consumes: `api` de `@quipu/convex-api`; `authClient.useSession()`.
- Produces: `OnboardingGate({ children })`.

- [ ] **Step 1: Test fallando** (mock de `authClient.useSession` y `useQuery`): sin sesión → Redirect a `/(onboarding)/index`; con sesión + profile null → `/(onboarding)/sistema`; con profile → children.

```tsx
// Puntos de mock: jest.mock("@/lib/auth-client"), jest.mock("convex/react", () => ({ useQuery: jest.fn(), ... }))
// profile de fixture: { _id: "p1", onboardingComplete: true }
```

- [ ] **Step 2: Implementar**

```tsx
import { useQuery } from "convex/react";
import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { api } from "@quipu/convex-api";
import { authClient } from "@/lib/auth-client";

export default function OnboardingGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const hasSession = Boolean(session) && !isPending;
  const profile = useQuery(api.profiles.getMyProfile, hasSession ? {} : "skip");

  if (isPending || (hasSession && profile === undefined)) return null;

  if (!hasSession) return <Redirect href="/(onboarding)/index" />;
  if (!profile?.onboardingComplete) return <Redirect href="/(onboarding)/sistema" />;
  return <>{children}</>;
}
```

- [ ] **Step 3: Rutas.** `app/(onboarding)/_layout.tsx`:

```tsx
import { Stack } from "expo-router";
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sistema" />
    </Stack>
  );
}
```

En `app/_layout.tsx` añadir `<Stack.Screen name="(onboarding)" options={{ headerShown: false }} />`.
En `(tabs)/_layout.tsx`: `AuthGate` → `OnboardingGate`.
En `(auth)` screens: donde hoy hay `Redirect` a `/(tabs)` con sesión activa, cambiar a lógica: con sesión + sin profile → `/(onboarding)/sistema`; con profile → `/(tabs)`. El botón final de `create-account.tsx` ("Configurar mi sistema", hoy placeholder) → `router.replace("/(onboarding)/sistema")`.
En `(onboarding)/index` (Task 5) y `sistema` (Task 5/10): guard inverso — con profile → `/(tabs)`; sin sesión en `sistema` → `/(auth)/sign-in`.

- [ ] **Step 4: Tests PASS + `pnpm lint && pnpm typecheck`** → **Step 5: Commit** `feat(mobile): onboarding gate + route group`

---

### Task 5: Intro educativa (carrusel)

**Files:**
- Create: `apps/mobile/app/(onboarding)/index.tsx`
- Create: `apps/mobile/modules/onboarding/components/intro-carousel.tsx`
- Create: `apps/mobile/modules/onboarding/components/intro-slides.tsx` (data de las 3 pantallas)
- Test: `apps/mobile/__tests__/modules/onboarding/intro-carousel.test.tsx`

**Interfaces:**
- Consumes: `marketFromCurrencyCode` no; solo tokens UI y router.
- Produces: rutas `/(onboarding)/index` (intro) y CTA → `/(auth)/sign-in` | `/(auth)/create-account`.

- [ ] **Step 1: Test fallando**: renderiza 3 slides, dots activos por página, botón "Ya tengo cuenta" navega a sign-in (mock `useRouter`).
- [ ] **Step 2: Implementar** — `FlatList` `pagingEnabled` horizontal sobre `Dimensions.get("window").width`, dots custom (3 `View h-1 w-6 rounded-full`, activo `bg-foreground`, resto `bg-line`).

`intro-slides.tsx` — data por slide: `eyebrow` (mono small-caps), `title` (font-newsreader text-[34px] leading-tight), `body`, `footer` opcional:

1. `eyebrow: "QUIPU"`, title: "Divide tu dinero antes de gastarlo, no después.", body: "No es una app de cuentas ni un banco. Es un sistema para responder una sola pregunta, todos los días.", quote: "¿Cuánto puedo gastar hoy sin arruinar mi mes?" (font-newsreader text-primary).
2. `eyebrow: "LOS TRES SOBRES"`, title: "Todo lo que entra se reparte apenas llega.", barra segmentada estática (`bg-needs` 50% / `bg-wants` 30% / `bg-savings` 20% — colores literales en un Record para uniwind) + 3 filas (Necesidades 50% / Gustos 30% / Ahorro 20% con copy del mockup) + nota "Los porcentajes son tuyos: puedes cambiarlos cuando quieras."
3. `eyebrow: "CICLOS Y DISPONIBLE DIARIO"`, title: "Cada día, un número. Ese es todo el trabajo.", body: "Quipu resta tus compromisos y tu ahorro, divide lo que queda entre los días del ciclo y te dice cuánto puedes gastar hoy.", card estática "PUEDES GASTAR HOY / S/ 42.30" + reglas (gastas de más → mañana baja; de menos → mañana sube; tu ahorro → no se toca).

CTAs: slide 1 "Cómo funciona" (avanza con `listRef.scrollToIndex`), slides 2–3 "Siguiente"; slide 3 "Crear mi cuenta" → `/(auth)/create-account`. "Ya tengo cuenta" fijo bajo el CTA en slide 1 → `/(auth)/sign-in`. Guard inverso al montar: `useQuery(api.profiles.getMyProfile, hasSession ? {} : "skip")` — con profile → `router.replace("/(tabs)")`.

- [ ] **Step 3: Tests PASS** → **Step 4: Commit** `feat(mobile): onboarding intro carousel`

---

### Task 6: Shell del wizard + Paso 01 (perfil)

**Files:**
- Create: `apps/mobile/app/(onboarding)/sistema.tsx` (orquestador: provider + render del paso actual)
- Create: `apps/mobile/modules/onboarding/components/wizard-shell.tsx` (header back + "TU SISTEMA · 0N/04" + barras de progreso 4 segmentos + slot de contenido + CTA fijo abajo)
- Create: `apps/mobile/modules/onboarding/components/step-1-income-profile.tsx`
- Test: `apps/mobile/__tests__/modules/onboarding/step-1.test.tsx`

**Interfaces:**
- Consumes: `useOnboarding`, `WizardStep`.
- Produces: `WizardShell({ stepNumber, children, footer })`; `Step1IncomeProfile` (dispatch `UPDATE { incomeModel }` + `SET_STEP 2`).

- [ ] **Step 1: Test fallando**: renderiza 3 opciones; tocar "Fijo" lo marca seleccionado (borde `border-primary bg-primary/5` + `Check`); "Continuar" deshabilitado sin selección, con selección dispatch y avanzar.
- [ ] **Step 2: Implementar.** Opciones con copy del mockup (≠ web): Fijo — "Sueldo en planilla, siempre el mismo monto y la misma fecha."; Variable — "Recibos por honorarios, negocio propio o ingresos por proyecto."; Mixto — "Un sueldo base más trabajos extra que aparecen de vez en cuando." Nota inferior para variable: "Con ingresos variables, Quipu calcula el disponible sobre lo que ya recibiste, nunca sobre lo que esperas recibir."
- [ ] **Step 3: Tests PASS** → **Step 4: Commit** `feat(mobile): wizard shell + paso 1 perfil`

---

### Task 7: Paso 02 — router por modelo (fijo / variable / mixto)

**Files:**
- Create: `apps/mobile/modules/onboarding/components/step-2-system.tsx`
- Create: `apps/mobile/modules/onboarding/components/frequency-picker.tsx` (segmented control)
- Create: `apps/mobile/modules/onboarding/components/amount-input.tsx` (input grande "S/ 3,500" con símbolo y cursor)
- Test: `apps/mobile/__tests__/modules/onboarding/step-2.test.tsx`

**Interfaces:**
- Consumes: `FREQ_OPTIONS`, `FREQ_DRIFT_COPY`, `PAYDAYS_BY_FREQUENCY` (Task 1), `estimateDailyAvailable`, `CYCLE_DAYS_BY_FREQUENCY` (Task 2).
- Produces: `Step2System` — fijo: dispatch `UPDATE { payFrequency, referenceIncomeCents }` + `SET_STEP 3`; variable: `UPDATE { cycleDurationDays, variableIncomeSources }` + `SET_STEP 3`; mixto: frecuencia + `mixedFixedAmountCents` + fuentes.

- [ ] **Step 1: Test fallando**:
  - Fijo + quincenal: NO se piden días (no hay input de días); "Continuar" avanza.
  - Input monto: acepta dígitos, guarda céntimos (escribe "3500" → `referenceIncomeCents: 350000`).
  - Preview "TU CICLO SERÍA · 1–30 DE CADA MES · 30 DÍAS" aparece con frecuencia mensual; con quincenal "1 – 15 / 16 – 30"; semanal "7 días".
  - Variable: pills 15/30 días + lista de fuentes (chips con input).
- [ ] **Step 2: Implementar.**
  - Header paso: back → `SET_STEP 1`. Progreso "TU SISTEMA · 02/04".
  - Fijo: `frequency-picker` (3 segmentos, activo `bg-background` sombra) + label mono "DÍA DE PAGO" → texto fijo por frecuencia ("El 15 y 30 de cada mes" / "El 1 de cada mes" / "Cada 7 días") + copy `FREQ_DRIFT_COPY` + label "CUÁNTO SUELES RECIBIR" + `amount-input` + helper "Es solo una referencia para armar el primer ciclo. Cuando registres tu ingreso real, Quipu recalcula." + card preview "TU CICLO SERÍA …".
  - Variable: label mono "DURACIÓN DEL CICLO" + 2 pills (15/30 días) + "¿DE DÓNDE LLEGA TU DINERO?" + chips de fuentes (agregar/eliminar, máx 30 chars).
  - Mixto: frecuencia + monto fijo (amount-input, label "PARTE FIJA APROXIMADA") + fuentes variables.
  - El monto de referencia es opcional: si falta, el paso 03 muestra solo %, sin montos.
- [ ] **Step 3: Tests PASS** → **Step 4: Commit** `feat(mobile): paso 2 sistema (fijo/variable/mixto)`

---

### Task 8: Paso 03 — reparto 50/30/20 con sliders

**Files:**
- Create: `apps/mobile/modules/onboarding/components/step-3-allocation.tsx`
- Create: `apps/mobile/modules/onboarding/components/allocation-slider.tsx`
- Test: `apps/mobile/__tests__/modules/onboarding/step-3.test.tsx`

**Interfaces:**
- Consumes: `distributeEnvelope`, `ALLOCATION_DEFAULTS` (Task 1); `formatSoles` (Task 2); `useOnboarding`.
- Produces: `Step3Allocation` — dispatch `UPDATE { allocationNeeds/Wants/Savings }` + `SET_STEP "confirm"`.

- [ ] **Step 1: Test fallando**: mover slider de Necesidades a 60 ajusta los otros dos (suma 100); "Volver al 50/30/20 recomendado" restaura defaults; montos en S/ junto al % si hay `referenceIncomeCents`.
- [ ] **Step 2: Implementar.** Slider: `@expo/ui` Slider (o `react-native` `Slider` de la comunidad si `@expo/ui` no expone — preferir `@expo/ui` según AGENTS del repo). Colores por sobre literales (`bg-needs`/`bg-wants`/`bg-savings`). Barra segmentada arriba con las 3 proporciones en vivo. Fila: nombre + `{n}%` + `formatSoles(referenceIncomeCents * n / 100)` si hay referencia. Footer: "Suma" + `100% ✓` (`Check` icon verde) — el estado no-suma-100 es imposible por `distributeEnvelope`, pero el indicador se calcula. CTA secundario: `Pressable` texto "Volver al 50/30/20 recomendado" → `UPDATE ALLOCATION_DEFAULTS`.
- [ ] **Step 3: Tests PASS** → **Step 4: Commit** `feat(mobile): paso 3 reparto 50/30/20`

---

### Task 9: Paso 04 — compromisos (chips + lista editable)

**Files:**
- Create: `apps/mobile/modules/onboarding/components/step-4-commitments.tsx`
- Create: `apps/mobile/modules/onboarding/components/commitment-row.tsx` (nombre, monto editable, día, X)
- Test: `apps/mobile/__tests__/modules/onboarding/step-4.test.tsx`

**Interfaces:**
- Consumes: `useOnboarding` (`ADD_COMMITMENT` / `UPDATE_COMMITMENT` / `REMOVE_COMMITMENT`); `formatSoles` (Task 2).
- Produces: `Step4Commitments` — "Continuar" → `SET_STEP "confirm"`; "Después" → `REMOVE` nada + `SET_STEP "confirm"` (los compromisos que existan en estado se mantienen).

- [ ] **Step 1: Test fallando**: tocar chip "+ Agua" agrega fila "Agua" vacía; editar monto 1100 → `amountCents: 110000`; editar día 5 → `dueDay: 5`; X elimina; total "Se reserva de Necesidades S/ 1,265" con los del fixture; "Después" visible bajo "Continuar".
- [ ] **Step 2: Implementar.** Chips: `["Agua", "Celular", "Gimnasio", "Streaming", "Otro"]` — estilos `border border-dashed border-line rounded-full px-3.5 py-2` (el mockup: bordes punteados). Cada fila: input nombre (editable), input monto numérico, label mono "CADA DÍA {n}" con input día (1–31), `X` (reicon) para eliminar. Validación por fila: monto > 0 y día 1–31; filas inválidas se marcan y "Continuar" las bloquea. Total = `sum(amountCents)` de filas válidas. Copy header: "Los reservamos de Necesidades para que nunca aparezcan como sorpresa."
- [ ] **Step 3: Tests PASS** → **Step 4: Commit** `feat(mobile): paso 4 compromisos`

---

### Task 10: Confirmación + submit Convex + éxito

**Files:**
- Create: `apps/mobile/modules/onboarding/components/step-confirm.tsx`
- Create: `apps/mobile/modules/onboarding/components/step-success.tsx`
- Create: `apps/mobile/modules/onboarding/use-complete-onboarding.ts`
- Modify: `apps/mobile/app/(onboarding)/sistema.tsx` (wire de todos los pasos)
- Modify: `apps/mobile/app/(auth)/create-account.tsx` (botón final "Configurar mi sistema" → `/(onboarding)/sistema`)
- Test: `apps/mobile/__tests__/modules/onboarding/confirm.test.tsx`
- Test: `apps/mobile/__tests__/modules/onboarding/use-complete-onboarding.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3; `api` de `@quipu/convex-api`; `buildOnboardingPayload`.
- Produces: `useCompleteOnboarding(): { submit: () => Promise<void>; isSubmitting: boolean; error: string | null }` — 1) `useMutation(api.profiles.createProfile)` con `buildOnboardingPayload(state)`; 2) con el `profileId` retornado, si `state.commitments.length > 0`: `useMutation(api.fixedCommitments.createCommitmentsBulk)` con `{ profileId, commitments: state.commitments.map(({ name, amountCents, dueDay }) => ({ name, amount: amountCents, envelope: "needs", dueDay })) }`; 3) `SET_STEP "success"`.

- [ ] **Step 1: Test fallando** del hook (mock `useMutation`): llama createProfile con payload correcto (sin `referenceIncomeCents`); con 2 compromisos llama bulk con `envelope: "needs"` y montos en céntimos; error de Convex → `error` no vacío; sin compromisos NO llama bulk.
- [ ] **Step 2: Implementar hook**

```ts
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "@quipu/convex-api";
import { buildOnboardingPayload } from "@/shared/lib/onboarding/payload";
import { useOnboarding } from "./onboarding-provider";

export function useCompleteOnboarding() {
  const { state, dispatch } = useOnboarding();
  const createProfile = useMutation(api.profiles.createProfile);
  const createBulk = useMutation(api.fixedCommitments.createCommitmentsBulk);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = buildOnboardingPayload(state);
      const profileId = await createProfile(payload);
      if (state.commitments.length > 0) {
        await createBulk({
          profileId,
          commitments: state.commitments.map((c) => ({
            name: c.name, amount: c.amountCents, envelope: "needs" as const, dueDay: c.dueDay,
          })),
        });
      }
      dispatch({ type: "SET_STEP", payload: "success" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear tu sistema. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }, [state, createProfile, createBulk, dispatch]);

  return { submit, isSubmitting, error };
}
```

- [ ] **Step 3: Test fallando** `step-confirm`: muestra "PODRÁS GASTAR AL DÍA" con `formatDailyAvailable(estimateDailyAvailable(...))`; desglose (ingreso, 3 sobres con % y monto, compromisos reservados); "Empezar mi ciclo" (bg-primary) llama `submit` y muestra loading; `error` se renderiza; "Ajustar algo" → `SET_STEP 3`. Si no hay referencia de ingreso: la card muestra "—" y copy "Registra tu primer ingreso para ver tu disponible al día."
- [ ] **Step 4: Implementar** `step-confirm` y `step-success` (éxito: logo + "Tu sistema está listo, {nombre}" — nombre del perfil de Better Auth si disponible, else sin nombre — copy "De aquí en adelante Quipu solo te pide una cosa: registrar lo que gastas." + CTA "Ir a Inicio" → `router.replace("/(tabs)")` + `dispatch RESET`).
- [ ] **Step 5: Wire `sistema.tsx`**: `OnboardingProvider` + switch por `state.step`; guards: sin sesión → `/(auth)/sign-in`; profile completo al montar → `/(tabs)`.
- [ ] **Step 6: Tests PASS + lint + typecheck** → **Step 7: Commit** `feat(mobile): confirmación, submit convex y éxito del onboarding`

---

### Task 11: Verificación final

- [ ] **Step 1:** `cd apps/mobile && pnpm test && pnpm lint && pnpm typecheck` — todo verde.
- [ ] **Step 2:** Smoke manual contra Convex dev local (`CONVEX_AGENT_MODE=anonymous npx convex dev --typecheck disable` en `apps/web` + `EXPO_PUBLIC_CONVEX_URL` apuntando ahí):
  1. Sin sesión → intro → "Crear mi cuenta" → registro → wizard
  2. Wizard fijo (quincenal, S/ 3,500) → 3 compromisos → confirmar → verificar en Convex: profile con `paydays [15,30]`, allocs 50/30/20 + 3 `fixedCommitments` con `envelope: "needs"`
  3. Wizard variable (15 días + fuentes) sin payFrequency en profile
  4. "Después" en paso 04 → sin compromisos creados
  5. Relanzar app con sesión: sin profile → wizard; con profile → inicio (intro nunca aparece)
- [ ] **Step 3:** Actualizar `docs/QUIPU-MASTER.md` §8 (móvil: onboarding financiero hecho) y cerrar DEV-1..4 en Linear con nota.
- [ ] **Step 4:** Commit `docs: mobile onboarding listo + smoke` y push de la rama.
