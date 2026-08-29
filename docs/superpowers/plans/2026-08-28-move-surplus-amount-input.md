# Vista "Mover más al ahorro" v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar slider+chips de monto por un input editable libre (vacío por defecto) con atajos neutros, y simplificar la jerarquía visual (verde solo en selección y CTA).

**Architecture:** Solo frontend. `MoveSurplusForm` mantiene el contrato actual (props y `MoveSurplusFormValues` con `amountCents: number`); el input escribe en soles y se convierte con `parseToCents` existente (`shared/lib/money.ts:84`). Sin cambios en schemas ni Convex.

**Tech Stack:** Next.js, TanStack Form, zod, Tailwind, Vitest, Biome.

## Global Constraints

- No tocar `modules/savings/schemas.ts` ni nada en `convex/`.
- No borrar `shared/components/ui/slider.tsx` (solo deja de usarse aquí).
- Verde (`border-moss bg-qp-success text-qp-deep`) solo en: chips "Desde" seleccionado, tarjeta "Hacia" seleccionada, CTA final. Atajos de monto siempre neutros.
- Monto inicial **vacío** salvo deep-link (`initialAmountCents > 0`).
- Textos en español, definidos como constantes en `modules/savings/constants.ts`.
- Tests: `pnpm vitest run <archivo>`; lint: `pnpm lint` (biome); tipos: `pnpm typecheck`.

---

### Task 1: Constantes de copy

**Files:**
- Modify: `modules/savings/constants.ts` (sección `MOVE_SURPLUS_*`, ~líneas 151-186)

**Interfaces:**
- Produces: `MOVE_SURPLUS_AMOUNT_PLACEHOLDER`, `MOVE_SURPLUS_SHORTCUT_ALL` (los consume Task 2).

- [ ] **Step 1: Añadir constantes** después de `MOVE_SURPLUS_AMOUNT_AVAILABLE_SUFFIX`:

```ts
export const MOVE_SURPLUS_AMOUNT_PLACEHOLDER = "¿Cuánto quieres mover?";
export const MOVE_SURPLUS_SHORTCUT_ALL = "Todo";
```

- [ ] **Step 2: Verificar que no rompe nada**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add modules/savings/constants.ts
git commit -m "feat(savings): constantes para input de monto libre en mover sobrante"
```

---

### Task 2: Form con input editable (reemplaza slider)

**Files:**
- Modify: `modules/savings/components/move-surplus-form.tsx`
- Test: smoke manual (no hay tests del form; el schema ya está testado en `modules/savings/lib/__tests__/schemas.test.ts`)

**Interfaces:**
- Consumes: `parseToCents(input: string): number | null` de `@/shared/lib/money`; `formatCents` de `@/shared/lib/money`; constantes de Task 1.
- Produces: mismo `Props` y `onSubmit(values: MoveSurplusFormValues)` — sin cambios para `move-surplus-view.tsx`.

- [ ] **Step 1: Ajustar imports** — quitar `Slider`; añadir `useEffect` de react (no; no hace falta — solo `useState`) y constantes nuevas:

```tsx
// quitar:
import { Slider } from "@/shared/components/ui/slider";
// añadir a imports de react:
import { useMemo, useState } from "react";
// añadir a imports de money:
import { formatCents, parseToCents } from "@/shared/lib/money";
// añadir a imports de constants:
import { MOVE_SURPLUS_AMOUNT_PLACEHOLDER, MOVE_SURPLUS_SHORTCUT_ALL } from "../constants";
// quitar MOVE_SURPLUS_PILL_ALL_SUFFIX de imports (ya no se usa)
```

- [ ] **Step 2: Estado local del texto + defaults.** Reemplazar el cálculo de `defaultAmountCents` (líneas ~107-112) y añadir estado tras `useForm`:

```tsx
const defaultAmountCents =
  initialAmountCents != null && initialAmountCents > 0
    ? Math.min(initialAmountCents, defaultAvailable)
    : 0;

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
```

```tsx
const [amountText, setAmountText] = useState(
  defaultAmountCents > 0 ? centsToInput(defaultAmountCents) : "",
);
```

El `useForm` queda igual (`amountCents: defaultAmountCents`).

- [ ] **Step 3: Cambio de origen NO resetea el monto.** En el onClick del chip de origen (líneas ~174-177), eliminar la línea `form.setFieldValue("amountCents", sourceAvailable);` — solo `form.setFieldValue("fromSource", source);`.

- [ ] **Step 4: Reemplazar sección "Cuánto mover"** (líneas ~195-257: display box + Slider + pills) por:

```tsx
<section>
  <p className="mb-2.5 text-[12.5px] font-medium text-ink-secondary">
    {MOVE_SURPLUS_AMOUNT_LABEL}
  </p>
  <div className="flex h-16 items-center justify-between rounded-xl border border-qp-shield-line bg-card px-5">
    <input
      value={amountText}
      onChange={(event) => {
        const raw = event.target.value;
        setAmountText(raw);
        const cents = parseToCents(raw);
        form.setFieldValue("amountCents", cents ?? 0);
      }}
      inputMode="decimal"
      placeholder={MOVE_SURPLUS_AMOUNT_PLACEHOLDER}
      aria-label={MOVE_SURPLUS_AMOUNT_LABEL}
      className="w-full bg-transparent font-serif text-[34px] leading-none text-ink placeholder:text-faint focus:outline-none"
    />
    <span className="shrink-0 pl-3 text-[13px] text-faint">
      {MOVE_SURPLUS_AMOUNT_AVAILABLE_PREFIX}{" "}
      {formatCents(available, { currency: currencyCode })}{" "}
      {MOVE_SURPLUS_AMOUNT_AVAILABLE_SUFFIX}
    </span>
  </div>
  <form.Field name="amountCents">
    {(field) =>
      field.state.meta.errors.length > 0 ? (
        <p className="mt-1.5 text-[12.5px] text-danger-ink">
          {String(field.state.meta.errors[0]?.message ?? "")}
        </p>
      ) : null
    }
  </form.Field>
  <div className="mt-3.5 flex flex-wrap gap-2">
    {[10_000, 30_000].map((increment) => (
      <button
        key={increment}
        type="button"
        disabled={available <= 0}
        onClick={() => {
          const next = Math.min(available, amountCents + increment);
          form.setFieldValue("amountCents", next);
          setAmountText(centsToInput(next));
        }}
        className="rounded-[10px] border border-line bg-card px-3.5 py-2 text-[13px] text-ink-secondary hover:bg-surface-soft"
      >
        + {formatCents(increment, { currency: currencyCode })}
      </button>
    ))}
    <button
      type="button"
      disabled={available <= 0}
      onClick={() => {
        form.setFieldValue("amountCents", available);
        setAmountText(centsToInput(available));
      }}
      className="rounded-[10px] border border-line bg-card px-3.5 py-2 text-[13px] text-ink-secondary hover:bg-surface-soft"
    >
      {MOVE_SURPLUS_SHORTCUT_ALL}
    </button>
  </div>
</section>
```

- [ ] **Step 5: Banner → texto plano.** Reemplazar el div del banner (líneas ~309-319, `border-qp-shield-line bg-qp-success` con icono) por:

```tsx
<p className="text-[13px] text-mute">
  <strong className="font-semibold">
    {MOVE_SURPLUS_CYCLE_BANNER_EMPHASIS}
  </strong>{" "}
  {MOVE_SURPLUS_CYCLE_BANNER_REST}
</p>
```

- [ ] **Step 6: CTA.** El botón "Mover …" ya usa `sliderValue` (línea ~343); renombrar a `amountCents` en ese formato (misma variable del Subscribe, ya existe):

```tsx
{MOVE_SURPLUS_SUBMIT_CTA_PREFIX}{" "}
{formatCents(amountCents, { currency: currencyCode })}
```

El `disabled` actual (`amountCents <= 0 || amountCents > available || !destinationId`) queda igual — cubre monto vacío (parse falla → 0).

- [ ] **Step 7: Smoke manual.** `pnpm dev`, ir a Ahorros → Mover al ahorro:
  - Input vacío con placeholder; CTA disabled.
  - Escribir `47,5` → CTA "Mover S/ 47.50" habilitado.
  - Escribir más que el disponible → error inline, CTA disabled.
  - Atajos `+ S/ 100`, `+ S/ 300`, `Todo` actualizan input; nunca verdes.
  - Cambiar "Desde" con monto escrito que excede el nuevo disponible → error, sin machacar el valor.

- [ ] **Step 8: Lint + typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS (sin warning de `Slider` sin uso — se quitó el import)

- [ ] **Step 9: Commit**

```bash
git add modules/savings/components/move-surplus-form.tsx
git commit -m "feat(savings): input de monto libre en mover sobrante, fuera slider"
```

---

### Task 3: Verificación final

- [ ] **Step 1:** `pnpm test -- run` (vitest) — PASS (schemas.test.ts intacto).
- [ ] **Step 2:** `pnpm lint && pnpm typecheck` — PASS.
- [ ] **Step 3:** Confirmar que `grep -r "Slider" modules/savings` no devuelve resultados (slider desacoplado de la vista).
