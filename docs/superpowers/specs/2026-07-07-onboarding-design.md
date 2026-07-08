# Onboarding de Quipu v2 — Diseño

**Fecha:** 2026-07-07
**Estado:** Borrador para review del usuario
**Owner:** Implementación a cargo del agente bajo el framework Quipu v2

---

## 1. Resumen y objetivos

Quipu v2 reemplaza el onboarding de v1 (basado en strings de error y sin guía) por un **wizard de 8 pasos** que captura la información mínima para inicializar el primer ciclo financiero del usuario: su nombre, cómo cobra, cuándo cobra, cómo reparte su dinero, y qué compromisos fijos tiene. El objetivo es **sub-3-minutos, sin abandonar el contexto de "copiloto"**, y dejar al usuario con un dashboard vacío pero listo para registrar su primer ingreso (que sí dispara el ciclo y la repartición 50/30/20).

**Lo que el onboarding SÍ hace:**
- Captura `name`, `incomeModel`, `payFrequency`, `paydays[]`, `allocation{Needs|Wants|Savings}`, `commitments[]` (opcional), `workerType`, `country`, `currencyCode/Symbol`.
- Persiste todo en una sola `createProfile` (atómica) + `createCommitmentsBulk` (atómica, opcional).
- Redirige a `/dashboard` con el perfil creado.

**Lo que el onboarding NO hace (fuera de scope):**
- **No pide el sueldo.** Quipu no pregunta cuánto gana. Los sobres se llenan cuando el usuario registra su primer ingreso real (feature aparte, payday).
- **No dispara el primer ciclo.** El ciclo financiero se activa al registrar el primer ingreso, no al terminar el onboarding.
- **No hace drafts retomables.** El state vive en cliente + `sessionStorage`. Refrescar la página preserva el progreso, cerrar pestaña lo pierde. Aceptable para "menos de 3 minutos".
- **No maneja multi-moneda.** Perú/PEN hardcoded.
- **No muestra el browser chrome decorativo de Figma.** Era referencia visual, no UI.

---

## 2. Decisiones arquitectónicas

| Decisión | Razón |
|---|---|
| **Una sola ruta** `/configurar` con query param `?step=N` | KISS/DRY: 1 `page.tsx`, 1 `layout.tsx`, 8 componentes, no 8 carpetas `step-N/`. URL compartible y bookmarkable. |
| **State del wizard en cliente** (`useReducer` + Context) | Sin tabla `onboardingDrafts` en Convex. Sin complejidad de "retomar donde quedaste". |
| **`sessionStorage` como persistencia intermedia** | Recargar la página no pierde el state. Se hidrata en mount desde el Context provider. |
| **Server Action para la finalización** (`completeOnboardingAction`) | Necesita combinar 2 mutations (`createProfile` + opcional `createCommitmentsBulk`) y redirigir a `/configurar?step=8` (la pantalla de confirmación). El paso 8 tiene un botón secundario "Ir a mi resumen" que lleva a `/dashboard`. |
| **No `cacheComponents`** | El wizard es 100% interactivo; no hay nada cacheable entre usuarios. |
| **Migración de errores en `convex/profiles.ts` y `fixedCommitments.ts` a `ConvexError`** | Discriminar errores en cliente para mostrar mensajes en español, no "Hubo un error" genérico. |
| **Nueva mutation `createCommitmentsBulk`** | Convex no tiene batch nativo; alternativa es N round-trips. Bulk evita latencia acumulada y es transaccional. |
| **Tokens semánticos para sobres** (`--needs`, `--wants`, `--savings`) | El código dice `bg-needs` en vez de `bg-primary`. Si en el futuro se quiere cambiar el azul, se hace en un solo lugar. |
| **Componentes shadcn a agregar** | `radio-group`, `slider`, `select`, `checkbox`, `sonner` (toast). shadcn ya está configurado, los primitives de Base UI son accesibles por default. |

---

## 3. Mapa de los 8 pasos

Cada paso es un componente `step-N-*.tsx` con `'use client'`. El `OnboardingWizard` (en `app/(onboarding)/configurar/page.tsx`) los mapea según `?step=`.

### Paso 1 — Bienvenida del copiloto

- **Componente:** `step-1-welcome.tsx`
- **Campos capturados:** `name: string` (1-60 caracteres, trim).
- **UI:**
  - Stepper de 8 nodos + indicador "Paso 1 de 8".
  - Card del copiloto: ícono compass (`Compass` de lucide) en cuadro `--primary-soft`, nombre "Tu copiloto", sub "en línea, listo para ayudar".
  - **Burbuja del copiloto** (alineada a la izquierda, fondo `--paper`, sin borde): "Hola 👋 En unos minutos dejamos tu dinero ordenado en tres sobres que trabajan por ti."
  - **Burbuja del usuario** (alineada a la derecha, fondo `--primary`, texto `--primary-foreground`): input con `placeholder="Tu nombre"` (pre-llenado si Better Auth tiene `name`).
  - Pill inferior: ícono `Clock` + "Menos de 3 minutos" (color `--success`).
  - CTA "Vamos →" full-width, deshabilitado si `name` está vacío.
- **Acción "Vamos":** `dispatch({ type: "UPDATE", payload: { name } })` + `router.push("/configurar?step=2")`.
- **Validación:** Zod `name: z.string().trim().min(1).max(60)`. Mensaje de error inline si > 60 caracteres.

### Paso 2 — Modelo de ingresos

- **Componente:** `step-2-income-model.tsx`
- **Campos capturados:** `incomeModel: "fixed" | "variable" | "mixed"`.
- **UI:**
  - Stepper (paso 1 con check verde, paso 2 activo) + "Paso 2 de 8".
  - Heading: "¿Cómo son tus ingresos?"
  - Sub: "Define cómo armamos tu ciclo. Puedes cambiarlo luego."
  - 3 `income-model-card.tsx` verticales:
    - **Fijos** (ícono `Calendar`): "Sueldo o planilla, fechas fijas."
    - **Variables** (ícono `Activity`): "Freelance, negocio, proyectos."
    - **Mixtos** (ícono `Layers`): "Un sueldo base + ingresos extra."
  - Banner info (fondo `--warning-soft`, ícono `Info`): "Variables y mixtos activan **cobertura progresiva**: primero lo esencial." (Término clave en negrita, sin definir acá; se explica en otra pantalla o tooltip defer.)
  - CTA "Continuar" deshabilitado hasta seleccionar uno. La card seleccionada tiene `aria-checked="true"` y borde `--primary`.
- **Acción "Continuar":** `dispatch({ UPDATE, payload: { incomeModel } })` + `router.push("/configurar?step=3")`.
- **Validación:** Zod enum. Sin error inline (la selección es la validación).

### Paso 3 — Frecuencia de ingreso

- **Componente:** `step-3-frequency.tsx`
- **Campos capturados:** `payFrequency: "monthly" | "biweekly" | "weekly" | "variable"`, `paydays: number[]` (1-31).
- **UI:**
  - Stepper + "Paso 3 de 8".
  - Heading: "¿Cada cuánto cobras?"
  - Sub: "Con solo definirlo cuándo empiezas y termina tu ciclo."
  - Grid 2×2 de `income-model-card.tsx` (variant="compact"):
    - **Mensual** (ícono `CalendarDays`): "1 vez al mes"
    - **Quincenal** (ícono `CalendarRange`): "Cada 15 días" *(default seleccionado, refleja el frame)*
    - **Semanal** (ícono `CalendarCheck`): "Cada 7 días"
    - **Variable** (ícono `Sparkles`): "Lo apunto yo"
  - Si la frecuencia seleccionada es **quincenal**, debajo aparece:
    - Card "Vista del ciclo quincenal" con un slider de 2 stops (Día 1 y Día 15) sobre un track horizontal. Labels "Día 1" con "Entra tu pago", "Día 15" con "Siguiente pago". El usuario puede arrastrar los stops dentro de 1-31.
  - Si la frecuencia es **mensual**: 1 input numérico "Día del mes" (1-31).
  - Si es **semanal**: solo frecuencia, sin días específicos.
  - Si es **variable**: no se captura nada más; copy "Cuando registres un ingreso, ese día será el inicio del nuevo ciclo."
  - CTA "Continuar" deshabilitado hasta que haya selección + días válidos.
- **Acción:** `dispatch({ UPDATE, payload: { payFrequency, paydays } })` + `router.push("/configurar?step=4")`.
- **Validación:** `isValidPaydays` de `convex/lib/budgetMath.ts` (reutilizar, no duplicar). El slider de quincena fuerza `paydays.length === 2`.

### Paso 4 — Ciclo financiero (vista derivada)

- **Componente:** `step-4-cycle-preview.tsx`
- **Campos capturados:** ninguno (read-only).
- **UI:**
  - Stepper + "Paso 4 de 8".
  - Heading: "Así se comporta tu ciclo".
  - Sub: "Reparte tu ingreso el día 1 y te acompañamos hasta el cierre."
  - **Timeline horizontal** (CSS custom, no librería):
    - Track `--border` con 3 nodos redondos: Día 1 (izquierda, relleno `--primary`), Día mitad (centro, `--primary-soft`), Día fin (derecha, `--primary`).
    - Labels arriba: "Día 1 / Entra tu pago", "Día X / Vas a mitad", "Siguiente pago".
    - El "Día X" se calcula como `Math.floor(CYCLE_DAYS[payFrequency] / 2)`.
  - Banner info (fondo `--primary-soft`, ícono `CalendarCheck`): "Tu ciclo {quincenal/mensual/semanal} de {N} días empieza hoy, {fecha Lima formateada}." (fecha = `formatLimaDate(Date.now())`).
  - CTA "Continuar →".
- **Acción:** `router.push("/configurar?step=5")`. No muta state.

### Paso 5 — Porcentajes de reparto

- **Componente:** `step-5-allocations.tsx`
- **Campos capturados:** `allocationNeeds: number`, `allocationWants: number`, `allocationSavings: number` (enteros 0-100, suma 100).
- **UI:**
  - Stepper + "Paso 5 de 8".
  - Heading: "¿Cómo repartimos tu dinero?"
  - Pill superior: ícono `Gift` + "Recomiendan: 50 / 30 / 20" (color `--success`).
  - **Barra segmentada** (`<div role="img" aria-label="Reparto actual: ...">`) con 3 segmentos proporcionales: Necesidades `--needs` / Gustos `--wants` / Ahorro `--savings`.
  - **3 sliders** (uno por sobre), cada uno con label, ícono, valor editable en `input type="number"` a la derecha (sincronizado), slider horizontal. Al mover un slider, los otros 2 se ajustan automáticamente para mantener suma 100. Algoritmo: la diferencia se reparte proporcionalmente entre los otros 2 (e.g., mover Necesidades de 50 a 60 reparte +5 a Gustos y +5 a Ahorro si estaban en 30/20; o todo a una sola si la otra está en 0). Esto es lógica de cliente pura, no necesita `largest-remainder` (que es para céntimos).
  - **Estado de error** (banner rojo `--destructive-soft`, ícono `AlertCircle`): "**El reparto no suma 100%** · Tu reparto suma {X}%. Ajusta para que sea exactamente 100% antes de continuar." Aparece si `total !== 100`. Botón "Continuar" deshabilitado en este estado.
  - CTA "Continuar" deshabilitado mientras `total !== 100`.
- **Acción:** `dispatch({ UPDATE, payload: { allocationNeeds, allocationWants, allocationSavings } })` + `router.push("/configurar?step=6")`.
- **Validación:** `isValidAllocations` reutilizado. El estado de error es funcional (banner), no error inline por slider.

### Paso 6 — Compromisos fijos

- **Componente:** `step-6-commitments.tsx`
- **Campos capturados:** `commitments: Array<{ name: string, amountCents: number, frequency: "monthly" | "first_payday" | "second_payday" | "every_payday", envelope: "needs" | "wants" }>` (opcional, puede ser `[]`).
- **UI:**
  - Stepper + "Paso 6 de 8".
  - Heading: "¿Tienes gastos fijos?"
  - Sub: "Los aparto de Necesidades antes de repartirlo."
  - Lista de compromisos ya agregados (cards con ícono + nombre + sub "cada {frecuency}" + monto a la derecha + botón `X` para eliminar). Default: vacío.
  - Botón `+ Agregar otro` que abre un `Sheet` o `Dialog` con form:
    - `name` (input texto)
    - `amountCents` (input moneda con prefijo S/)
    - `frequency` (radio-group: Mensual / Primera quincena / Segunda quincena / Cada quincena)
    - `envelope` (radio-group pequeño: Necesidades / Gustos)
    - Si `payFrequency === "monthly"`, forzar `frequency: "monthly"` y deshabilitar el control.
  - **Banner inferior** (fondo `--primary-soft`): "Aparte S/ {sum} de Necesidades para estos gastos." (sum = total de commitments con `envelope === "needs"`). Si no hay commitments, no aparece.
  - Dos CTAs:
    - Secundario (terciario en realidad, ghost): "Saltar" (envía array vacío).
    - Primario: "Continuar".
- **Acción "Continuar":** `dispatch({ UPDATE, payload: { commitments } })` + `router.push("/configurar?step=7")`.
- **Validación por commitment:** `name.trim().min(1).max(60)`, `amountCents > 0`, `frequency` válido, `envelope` válido. Errores inline en el dialog.

### Paso 7 — Vista previa (summary)

- **Componente:** `step-7-summary.tsx`
- **Campos capturados:** `workerType: "dependent" | "independent"`.
- **UI:**
  - Stepper + "Paso 7 de 8".
  - Heading: "Así se verá tu Quipu".
  - Sub: "Todo listo. Lo cerramos cuando quieras."
  - **Card preview** (fondo `--primary`, texto `--primary-foreground`):
    - Eyebrow: "DISPONIBLE PARA HOY"
    - Monto: `S/ —` (guión largo, no 0)
    - Línea: "Ciclo {frecuency} · {días} días · {N}/{W}/{S}"
  - 3 cards placeholder:
    - 🔵 Necesidades: ícono + label + `S/ —` a la derecha + barra al 0% con caption "Esperando tu primer ingreso"
    - 🟠 Gustos: idem
    - 🟢 Ahorro: idem
  - Banner sutil (fondo `--paper`): "Cuando registres tu primer ingreso, tus sobres se llenarán solos con tu {N}/{W}/{S}."
  - **Mini-pregunta de worker type** debajo del banner:
    - "¿Cómo trabajas?" + 2 radio-cards chicas lado a lado:
      - "Trabajo en planilla" (ícono `Briefcase`)
      - "Trabajo por mi cuenta" (ícono `Laptop`)
  - CTA "Activar mi copiloto" deshabilitado hasta seleccionar workerType.
- **Acción "Activar mi copiloto":** `dispatch({ UPDATE, payload: { workerType } })` + `startTransition(async () => { await completeOnboardingAction(state); router.replace("/dashboard"); })`.
- **Estado intermedio (mutación en curso):** el CTA cambia a `Spinner` + "Armando tus sobres..." (referencia del frame de estados). Banner superior reemplaza la card preview: ícono + "Guardando configuración · Armando tus sobres...".

### Paso 8 — Confirmación final

- **Componente:** `step-8-confirmation.tsx`
- **Campos capturados:** ninguno.
- **UI (Server Component, no client):**
  - Stepper: todos los pasos con check.
  - **Background `--primary`** (no `--background`). Figma muestra fondo azul.
  - Círculo blanco grande con `Check` (lucide) centrado.
  - Heading: "¡Tu Quipu está listo!"
  - Sub: "Tu primer ciclo {frecuency} empieza hoy. Ya te aviso cuando puedas gastar cada día."
  - Pill: "Ciclo 1 · {fecha inicio} → {fecha fin} · 8:00" (formateado con `formatLimaDate`).
  - CTA secundario (outline blanco): "Ir a mi resumen →" → `router.push("/dashboard")`.
- **Cómo se llega:** tras éxito de `completeOnboardingAction`, el action hace `redirect("/configurar?step=8")`. El wizard detecta paso 8 y muestra este componente. **Decisión alternativa:** el action redirige directo a `/dashboard`. Esta opción (paso 8) le da un momento de cierre emocional al usuario. **Decisión recomendada:** mantener el paso 8 como cierre (es 1 pantalla, vale la pena por UX).

---

## 4. Datos y schema

### `OnboardingState` (cliente, en `modules/onboarding/types.ts`)

```ts
import type { Doc } from "@/convex/_generated/dataModel";
import { z } from "zod";

export type IncomeModel = "fixed" | "variable" | "mixed";
export type PayFrequency = "monthly" | "biweekly" | "weekly" | "variable";
export type WorkerType = "dependent" | "independent";
export type CommitmentFrequency =
  | "monthly"
  | "first_payday"
  | "second_payday"
  | "every_payday";
export type CommitmentEnvelope = "needs" | "wants";

export type CommitmentDraft = {
  name: string;
  amountCents: number;
  frequency: CommitmentFrequency;
  envelope: CommitmentEnvelope;
};

export type OnboardingState = {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  name: string;
  incomeModel: IncomeModel | null;
  payFrequency: PayFrequency | null;
  paydays: number[];
  allocationNeeds: number;     // default 50
  allocationWants: number;     // default 30
  allocationSavings: number;   // default 20
  commitments: CommitmentDraft[];
  workerType: WorkerType | null;
  country: string;             // default "Perú"
  currencyCode: string;        // default "PEN"
  currencySymbol: string;      // default "S/"
};
```

### Zod schemas (en `modules/onboarding/schemas.ts`)

- `step1Schema`: `{ name: z.string().trim().min(1).max(60) }`
- `step2Schema`: `{ incomeModel: z.enum(["fixed", "variable", "mixed"]) }`
- `step3Schema`: `{ payFrequency: z.enum([...]), paydays: z.array(z.number().int().min(1).max(31)).min(1) }` con refinement por frecuencia.
- `step4Schema`: `z.void()` (read-only)
- `step5Schema`: `{ allocationNeeds, allocationWants, allocationSavings: z.number().int().min(0).max(100) }` con refinement `sum === 100`.
- `step6Schema`: `{ commitments: z.array(commitmentDraftSchema).default([]) }`
- `step7Schema`: `{ workerType: z.enum(["dependent", "independent"]) }`
- `finalPayloadSchema`: composición de todos los anteriores + `country`, `currencyCode`, `currencySymbol` con defaults.

### Persistencia final

`completeOnboardingAction` (en `modules/onboarding/actions.ts`):

```ts
"use server";
import { z } from "zod";
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
    const profileId = await fetchAuthMutation(
      api.profiles.createProfile,
      parsed,
    );
    if (parsed.commitments.length > 0) {
      await fetchAuthMutation(api.fixedCommitments.createCommitmentsBulk, {
        profileId,
        commitments: parsed.commitments,
      });
    }
    return { profileId };
  } catch (error) {
    throw fromConvexError(error);
  }
}
```

**Nota:** `createProfile` no devuelve `profileId` actualmente — devuelve `Id<"profiles">` directo. Hay que ajustar la firma. Detalle en §5.

---

## 5. Backend Convex

### Cambios en `convex/profiles.ts`

1. **Migrar errores a `ConvexError({ code, message })`** con códigos del enum `ErrorCode`:
   - `throw new ConvexError({ code: "UNAUTHORIZED", message: "..." })` (falta auth).
   - `throw new ConvexError({ code: "CONFLICT", message: "..." })` (perfil ya existe — actualmente `return existing._id` lo evita, pero el action necesita saber si fue creación o conflicto).
   - `throw new ConvexError({ code: "VALIDATION_ERROR", message: "...", meta: { field: "name" | "allocations" | "paydays" } })` para todas las validaciones de `name`, allocations, paydays.
2. **Devolver `{ profileId: Id<"profiles">, created: boolean }`** en vez de solo `Id<"profiles">`. Si ya existía, `created: false`. Esto permite al action saber si debe crear commitments (siempre que no exista, en realidad siempre se crea, pero por seguridad).

### Cambios en `convex/fixedCommitments.ts`

1. **Migrar errores** igual que arriba (`UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`).
2. **Nueva mutation `createCommitmentsBulk`:**
   ```ts
   export const createCommitmentsBulk = mutation({
     args: {
       profileId: v.id("profiles"),
       commitments: v.array(v.object({
         name: v.string(),
         amount: v.number(),
         envelope: v.union(v.literal("needs"), v.literal("wants")),
         frequency: v.union(
           v.literal("monthly"),
           v.literal("first_payday"),
           v.literal("second_payday"),
           v.literal("every_payday"),
         ),
       })),
     },
     handler: async (ctx, args) => {
       const identity = await ctx.auth.getUserIdentity();
       if (!identity) throw new ConvexError({ code: "UNAUTHORIZED", message: "..." });
       const profile = await ctx.db.get(args.profileId);
       if (!profile || profile.userId !== identity.subject) {
         throw new ConvexError({ code: "FORBIDDEN", message: "..." });
       }
       const frequency = profile.payFrequency === "monthly" ? "monthly" : undefined;
       const ids = [];
       for (const c of args.commitments) {
         if (!c.name.trim()) throw new ConvexError({ code: "VALIDATION_ERROR", message: "El nombre del compromiso es obligatorio.", meta: { field: "name" } });
         if (!Number.isInteger(c.amount) || c.amount <= 0) {
           throw new ConvexError({ code: "VALIDATION_ERROR", message: "El monto debe ser un entero de céntimos mayor a cero.", meta: { field: "amount" } });
         }
         const id = await ctx.db.insert("fixedCommitments", {
           profileId: args.profileId,
           name: c.name.trim(),
           amount: c.amount,
           envelope: c.envelope,
           frequency: profile.payFrequency === "monthly" ? "monthly" : c.frequency,
         });
         ids.push(id);
       }
       return ids;
     },
   });
   ```

### Schema Convex

**No se requieren cambios** en `convex/schema.ts`. Todos los campos necesarios ya existen en `profiles` y `fixedCommitments`.

---

## 6. Routing y archivos

### Estructura final

```
app/(onboarding)/
├── layout.tsx                          # Server Component, auth check, redirect /sign-in si no hay sesión
└── configurar/
    └── page.tsx                        # Server Component, getMyProfile, redirect /dashboard si existe perfil, sino <OnboardingWizard initialStep={searchParams.step} />

modules/onboarding/
├── components/
│   ├── onboarding-wizard.tsx           # 'use client' — controla paso vía ?step=, provee Context
│   ├── onboarding-shell.tsx            # Stepper + container (sin lógica de paso)
│   ├── onboarding-provider.tsx         # Context + reducer + sessionStorage hydration
│   ├── stepper.tsx                     # 8 nodos, indicadores check/activo/vacío
│   ├── step-1-welcome.tsx
│   ├── step-2-income-model.tsx
│   ├── step-3-frequency.tsx
│   ├── step-4-cycle-preview.tsx
│   ├── step-5-allocations.tsx
│   ├── step-6-commitments.tsx
│   ├── step-7-summary.tsx
│   ├── step-8-confirmation.tsx
│   ├── income-model-card.tsx           # Reusable para pasos 2 y 3
│   ├── commitment-row.tsx              # Card de un commitment
│   ├── commitment-form-dialog.tsx      # Dialog/sheet para agregar/editar commitment
│   ├── money-input.tsx                 # Reusable de shared/forms/ (si no existe, crear)
│   └── allocation-slider.tsx           # Un slider de allocation con número sincronizado
├── schemas.ts
├── types.ts
├── constants.ts                        # STEP_COUNT, STEP_IDS, ONBOARDING_DEFAULTS, etc.
├── actions.ts
└── queries.ts                          # (vacío por ahora)

shared/forms/                           # Si no existe, crear
├── money-input.tsx                     # Input con prefijo S/, inputMode="decimal", integrado con TanStack Form
└── (futuro: percent-input.tsx)

convex/profiles.ts                      # Modificado
convex/fixedCommitments.ts              # Modificado
app/globals.css                         # Tokens --needs, --wants, --savings agregados
```

### `app/(onboarding)/layout.tsx`

```ts
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/auth/auth-server";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const isAuthed = await isAuthenticated();
  if (!isAuthed) redirect("/sign-in");
  return <>{children}</>;
}
```

### `app/(onboarding)/configurar/page.tsx`

```ts
import { redirect } from "next/navigation";
import { fetchAuthQuery } from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { OnboardingWizard } from "@/modules/onboarding/components/onboarding-wizard";
import { parseStepId } from "@/modules/onboarding/constants";

type Props = {
  searchParams: Promise<{ step?: string }>;
};

export default async function ConfigurarPage({ searchParams }: Props) {
  const { step } = await searchParams;
  const profile = await fetchAuthQuery(api.profiles.getMyProfile, {});
  if (profile) redirect("/dashboard");
  return <OnboardingWizard initialStep={parseStepId(step) ?? 1} />;
}
```

`parseStepId` vive en `constants.ts` (no `types.ts`) porque es una función pura sobre constantes:

```ts
// modules/onboarding/constants.ts
export const STEP_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type StepId = (typeof STEP_IDS)[number];
export const STEP_COUNT = STEP_IDS.length;

export function parseStepId(input: string | undefined): StepId | null {
  if (!input) return null;
  const n = Number.parseInt(input, 10);
  return STEP_IDS.includes(n as StepId) ? (n as StepId) : null;
}
```

---

## 7. Componentes y tokens

### shadcn components a agregar

```bash
pnpm dlx shadcn@latest add radio-group slider select checkbox sonner
```

(Confirmar con el usuario antes de ejecutar.)

### Tokens CSS nuevos en `app/globals.css`

```css
:root {
  /* Aliases semánticos para sobres. Apuntan a --primary, --warning, --success. */
  --needs: oklch(0.4934 0.0735 251.4);
  --needs-soft: oklch(0.952 0.0093 242.84);
  --wants: oklch(0.638 0.1045 75.64);
  --wants-soft: oklch(0.9513 0.0217 83.26);
  --savings: oklch(0.5899 0.0745 150.44);
  --savings-soft: oklch(0.9482 0.0109 149.86);
}

.dark {
  --needs: oklch(0.7 0.1 251.4);
  --needs-soft: oklch(0.3 0.05 251.4 / 0.2);
  --wants: oklch(0.75 0.12 75.64);
  --wants-soft: oklch(0.3 0.05 75.64 / 0.2);
  --savings: oklch(0.7 0.1 150.44);
  --savings-soft: oklch(0.3 0.05 150.44 / 0.2);
}
```

Y en `@theme inline`:
```css
--color-needs: var(--needs);
--color-needs-soft: var(--needs-soft);
--color-wants: var(--wants);
--color-wants-soft: var(--wants-soft);
--color-savings: var(--savings);
--color-savings-soft: var(--savings-soft);
```

Esto habilita `bg-needs`, `text-needs`, `border-needs`, `bg-needs-soft`, etc.

### Convenciones de estilo

- Burbuja del copiloto: `bg-paper text-foreground rounded-2xl rounded-tl-sm px-4 py-3`.
- Burbuja del usuario: `bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3` (placeholder: `placeholder:text-primary-foreground/60`).
- Stepper: nodos de 24×24 px, gap 8 px entre nodos, track `--border` conectando.
- Card del copiloto (paso 1): `bg-card ring-1 ring-foreground/10 rounded-2xl p-6`.
- Card de sobre (paso 7): `bg-card rounded-xl p-4` con ícono de color (`text-needs`/`text-wants`/`text-savings`).

---

## 8. Errores y estados

### Códigos a usar (del enum existente en `core/errors/index.ts`)

| Backend lanza | Cliente discrimina con |
|---|---|
| `ConvexError({ code: "UNAUTHORIZED" })` | `error instanceof UnauthorizedError` o `error.code === "UNAUTHORIZED"` |
| `ConvexError({ code: "VALIDATION_ERROR", meta: { field } })` | Mostrar mensaje específico del módulo (no el del backend) |
| `ConvexError({ code: "CONFLICT" })` | "Ya tienes un perfil creado" + redirect a dashboard |
| `ConvexError({ code: "NOT_FOUND" })` | "Perfil no encontrado" + retry |

### Mensajes en español (en `modules/onboarding/constants.ts`)

```ts
export const ERROR_MESSAGES: Record<string, string> = {
  name_required: "Necesitamos un nombre para continuar.",
  name_too_long: "El nombre debe tener máximo 60 caracteres.",
  income_model_required: "Elige cómo son tus ingresos.",
  frequency_required: "Elige cada cuánto cobras.",
  paydays_invalid: "Los días de pago no son válidos.",
  allocations_invalid: "El reparto debe sumar exactamente 100%.",
  commitment_name_required: "El nombre del compromiso es obligatorio.",
  commitment_amount_invalid: "El monto debe ser mayor a cero.",
  worker_type_required: "Cuéntanos cómo trabajas para terminar.",
  network: "No pudimos guardar tu configuración. Revisa tu conexión e intenta de nuevo.",
  conflict: "Ya tienes un perfil creado. Te llevamos a tu resumen.",
};
```

### Estados intermedios (referencia del frame "ERRORES & ESTADOS INTERMEDIOS")

| Estado | Dónde aparece | UI |
|---|---|---|
| **Validación reparto** | Paso 5 | Banner `--destructive-soft` con texto del error, arriba de la barra segmentada. |
| **Guardando configuración** | Paso 7, al hacer clic en "Activar mi copiloto" | Card preview reemplazada por card `--primary-soft` con `Spinner` + "Armando tus sobres..." + barra de progreso indeterminada. |
| **Sin conexión / recuperación** | Global | Toast de `sonner` (severity warning): "Guardado localmente · Sincronizamos al recuperar señal". Se activa si `fetchAuthMutation` falla con `INTERNAL_ERROR` o `EXTERNAL_SERVICE_ERROR` y el state se persiste en `localStorage` (no sessionStorage) como respaldo. |
| **Recuperación al volver** | Mount del wizard | Si hay state en `localStorage` Y no hay perfil en Convex → banner superior: "Recuperamos tu configuración anterior. ¿Continuar desde el paso X?" con botones "Sí, continuar" / "No, empezar de nuevo". |

---

## 9. Accesibilidad

- **Radio-cards** (pasos 2, 3, 7 workerType): `role="radio"`, `aria-checked`, `tabIndex={0}`, navegación con flechas. Se logra con `<RadioGroup>` de Base UI (shadcn lo envuelve).
- **Sliders** (paso 3 quincena, paso 5 allocations): `<input type="range">` con `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext="50%"`, `aria-label="Necesidades"`.
- **Stepper:** `aria-label="Progreso del wizard, paso X de 8"`. Cada nodo con `aria-current="step"` si es el activo.
- **Burbujas del chat (paso 1):** sin role ARIA especial; son contenido visual. El input tiene `aria-label="Tu nombre"` y `aria-describedby="welcome-message"`.
- **Banner de error (paso 5):** `role="alert"`, `aria-live="polite"`.
- **Foco al cambiar de paso:** el `OnboardingWizard` mueve el foco al `<h1>` del paso actual al cambiar `?step=`. Implementación: `useEffect` + `headingRef.current?.focus()`.
- **Contraste:** el botón primario `--primary` sobre `--primary-foreground` ya pasa AA. El banner `--destructive-soft` con texto `--destructive` también. Verificar manualmente en dark mode (defer).
- **Navegación por teclado:** `Tab` recorre los radio-cards en orden, `Enter` o `Space` selecciona, `ArrowDown/Up` navega. Sliders con `ArrowLeft/Right`.

---

## 10. Fuera de scope

- **Multi-moneda real.** Solo Perú/PEN. Si en el futuro se necesita, se agrega un selector de país en el paso 5 actual y un mapa de currency a `core/constants.ts`.
- **Onboarding retomable entre sesiones** (más allá de sessionStorage). No se hace.
- **Primer payday / registrar primer ingreso.** Feature aparte, vive en `modules/payday/`. El onboarding solo deja al usuario en `/dashboard` listo para hacerlo.
- **Polar.sh y planes.** El campo `plan` queda `"free"` hardcoded; el webhook de Polar lo actualizará después.
- **Dark mode refinado.** Los tokens nuevos en `.dark` son una primera pasada; un PR de pulido de dark mode puede venir después.
- **Tests E2E del wizard** (Playwright). Se pueden agregar después; el spec no los exige para v2 inicial.
- **Animaciones de transición entre pasos.** `Router.push` ya da una transición nativa; no se agrega Framer Motion ni similar.
- **`cacheComponents`.** Sigue desactivado. El onboarding es 100% interactivo.

---

## 11. Orden de implementación sugerido

1. **Tokens CSS** (`app/globals.css`): agregar `--needs`, `--wants`, `--savings` y sus variantes `.dark`.
2. **shadcn add** de `radio-group`, `slider`, `select`, `checkbox`, `sonner`.
3. **Backend Convex**: migrar errores en `profiles.ts` y `fixedCommitments.ts`, agregar `createCommitmentsBulk`.
4. **`modules/onboarding/types.ts` y `constants.ts`**: tipos, defaults, mensajes.
5. **`modules/onboarding/schemas.ts`**: Zod schemas por paso + final.
6. **`shared/forms/money-input.tsx`**: input moneda reusable (si no existe).
7. **`modules/onboarding/components/onboarding-provider.tsx`**: Context + reducer + sessionStorage.
8. **`modules/onboarding/components/stepper.tsx`**: componente visual del stepper.
9. **Componentes de cada paso** (8), en orden: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.
10. **`modules/onboarding/components/onboarding-wizard.tsx`**: orquesta todo, lee `?step=`.
11. **`modules/onboarding/actions.ts`**: `completeOnboardingAction`.
12. **`app/(onboarding)/layout.tsx` + `app/(onboarding)/configurar/page.tsx`**: ruta.
13. **Redirects**: actualizar `app/(auth)/sign-in/page.tsx` para redirigir a `/configurar` en vez de `/dashboard`; actualizar `app/(dashboard)/dashboard/page.tsx` para redirigir a `/configurar` si no hay perfil.
14. **Validación end-to-end**: `pnpm tsc --noEmit`, `pnpm lint`, prueba manual de los 8 pasos.

---

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| **El usuario cierra la pestaña a mitad del wizard.** | `sessionStorage` preserva el state. `localStorage` como fallback. Banner de recuperación al volver. Si decide no continuar, empieza de nuevo con un click. |
| **El usuario abre 2 tabs del wizard.** | Ambas leen de sessionStorage. La primera que termine el onboarding redirige. La segunda detecta perfil existente y redirige a `/dashboard` (defensa en `app/(onboarding)/configurar/page.tsx`). |
| **El usuario cambia de pestaña y vuelve.** | No se pierde state (sessionStorage). El foco se restaura al heading del paso actual. |
| **Errores de Convex poco claros.** | Mensajes en español pre-definidos en `ERROR_MESSAGES`. `fromConvexError` mapea `code` → mensaje del módulo, no expone el del backend. |
| **Allocations no suman 100 al final.** | Imposible: el botón "Continuar" está deshabilitado mientras no sumen 100. Zod final también valida. |
| **Frequency `variable` sin días.** | Permitido por diseño. Copy explícito en paso 3. Zod acepta `paydays: []` si `payFrequency === "variable"`. |
| **El usuario es `independent` y elige `monthly` con un solo día.** | `isValidPaydays` ya valida `length >= 1` para `monthly`. OK. |
| **Refresco de la página en paso 8 (confirmación).** | El paso 8 es server-rendered tras `redirect` del action. No hay state de cliente que preservar. |

---

## 13. Decisiones explícitas (registro)

| Decisión | Razón | Fecha |
|---|---|---|
| Una sola ruta `/configurar` con `?step=` | KISS/DRY, URL compartible, 1 page.tsx en vez de 8 | 2026-07-07 |
| State del wizard en cliente + sessionStorage/localStorage | Sin tabla de drafts, refrescar preserva progreso | 2026-07-07 |
| Server Action para finalización | Necesita `redirect()` nativo + combina 2 mutations | 2026-07-07 |
| Migrar errores a `ConvexError` en este PR | Discriminar para mensajes en español, no strings | 2026-07-07 |
| Nueva mutation `createCommitmentsBulk` | Evitar N round-trips, atómico | 2026-07-07 |
| Tokens semánticos `--needs`/`--wants`/`--savings` | Cambiar color de sobre en un solo lugar | 2026-07-07 |
| Sin `cacheComponents` | Onboarding 100% interactivo, nada cacheable | 2026-07-07 |
| Mantener paso 8 (confirmación) | Cierre emocional del usuario tras configurar | 2026-07-07 |
| Sin browser chrome decorativo | Era referencia de Figma, no UI | 2026-07-07 |
| `name` en paso 1, burbuja de chat | Refuerza la metáfora "Tu copiloto" | 2026-07-07 |
| No preguntar el sueldo en el onboarding | Quipu registra el dinero real, no el estimado | 2026-07-07 |
| Stepper de 8 nodos en todos los pasos | Continuidad visual, sin jumps | 2026-07-07 |
