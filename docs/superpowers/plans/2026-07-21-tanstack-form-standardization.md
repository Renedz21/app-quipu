<!-- /autoplan restore point: C:/Users/User/.gstack/projects/app-quipu/chore-quipu-2.0-autoplan-restore-20260721.md -->

# Plan: Estandarizar formularios con TanStack Form + Zod

**Branch:** `chore/quipu-2.0`  
**Autor:** /autoplan (input del builder)  
**Status:** COMPLETE (P1 scope) — Phases 1–4 + `new-goal-dialog` (extra P2). **Verify:** `pnpm typecheck` OK; Vitest migrados (57 tests) OK. **Open:** E2E smoke completo en CI/local (`playwright install`); defer `settings-allocations-editor` + onboarding.
**Problema:** Flujos de captura (ingreso, gasto, compromisos, metas) usan muchos `useState`, validación ad hoc en `handleSubmit`, y componentes monolíticos. Auth ya usa el patrón canónico (`useForm` + Zod + `Field`/`FieldError`).

---

## Problem statement

El usuario identificó sobreingeniería engorrosa y “god components” (ej. `income-register-flow.tsx`) que mezclan estado de formulario, preview derivado, submit a Convex y UI de flujo en un solo archivo, **sin** validación Zod en el borde del cliente alineada al backend.

`@tanstack/react-form` está en `package.json` y el login/sign-up demuestran el patrón deseado. Hay más pantallas con el anti-patrón.

---

## Goals

1. Un solo patrón de formulario en la app (TanStack Form + Zod, mensajes en español).
2. Reducir god components: esquema + submit en capa clara; UI en subcomponentes.
3. Validación cliente coherente con mutaciones Convex (mismos límites: montos, `dueDay`, fuentes).
4. No regresionar smoke E2E (`pnpm test:e2e:smoke`).

## Non-goals

- Reescribir onboarding completo en este slice (solo si reparto/settings comparten el mismo anti-patrón crítico — ver fases).
- Migrar `@hookform/resolvers` (instalado pero no usado en auth; no introducir segundo stack).
- Tocar lógica de negocio en Convex salvo alinear schemas Zod compartidos si ya existen duplicados.

---

## Inventory (auditado en código)

| Ubicación | Campos / comportamiento | Problema | Prioridad |
|-----------|-------------------------|----------|-----------|
| `modules/income/components/income-register-flow.tsx` | monto, fuente, concepto, fecha, preview | 7+ `useState`, submit sin Zod, ~227 líneas monolito | P1 |
| `modules/expenses/components/expense-register-flow.tsx` | monto, sobre, descripción, multi-step | Mismo patrón que ingreso | P1 |
| `shared/components/commitments/add-commitment-dialog.tsx` | nombre, monto, día, sobre | `parseFloat`/`parseInt` manual, errores silenciosos (return early) | P1 |
| `modules/savings/components/new-goal-dialog.tsx` | label, target | 2 campos + submit manual | P2 |
| `modules/settings/components/settings-allocations-editor.tsx` | 3 % ligados (sum=100) | `useState` objeto + validación inline | P2 |
| `modules/onboarding/.../step-2-mixed.tsx`, `allocation-row.tsx` | drafts numéricos | Patrón draft OK para UX; evaluar form solo si suma cruzada | P3 defer |
| Auth (`sign-in-view`, `sign-up-view`) | — | **Referencia canónica** | — |
| `useState` para `open`, `step` wizard, `isSubmitting` | UI / navegación | **Permitido** junto al form (como sign-in) | N/A |

---

## What already exists

- **Patrón UI:** `modules/auth/components/sign-in-view.tsx`, `sign-up-view.tsx` — `useForm({ validators: { onChange: zodSchema } })`, pasos con `useState<Step>` separado del form.
- **Primitivos:** `shared/components/ui/field.tsx` (`Field`, `FieldError`, `FieldLabel`), `AuthInput` reusable pattern.
- **Validación compartida:** `shared/lib/validation/auth`, `modules/auth/schemas.ts`.
- **Dominio ingreso:** `modules/income/lib/incomeForm.ts`, `impactPreview.ts` (preview puro — queda fuera del form).
- **Maestro §6.4:** ✅ actualizado Phase 4 — captura con submit siempre TanStack + Zod; `useState` solo step/modal/result.

---

## Premises (confirmadas 2026-07-21 — maestro §6.4 actualizado)

1. **P1:** Todo formulario de **captura de datos con submit** (no solo toggles/modales vacíos) usará TanStack Form + Zod, no `useState` por campo.
2. **P2:** Los wizards multi-paso mantienen `useState` solo para **step** y **resultado post-submit**; los valores editables viven en `useForm`.
3. **P3:** ✅ `docs/QUIPU-MASTER.md` §6.4 refleja P1–P2 (Phase 4).
4. **P4:** Keypad de monto es un **field custom** del form (misma fuente de verdad que `amountCents`), con validadores reutilizando `isKeypadAmountValid`.
5. **P5:** Alcance fase 1 = P1 en tabla (ingreso, gasto, add-commitment); fase 2 savings/allocations sigue deferred.

---

## Phase execution log

| Phase | Scope | Status | Notes |
|-------|--------|--------|-------|
| 1 | Income schemas + split flow/form | ✅ Done | `modules/income/schemas.ts`, `income-register-form.tsx`, `lib/__tests__/schemas.test.ts`; flow solo `step`/`result`. |
| 2 | Expense mirror | ✅ Done | `modules/expenses/schemas.ts`, `expense-register-form.tsx`, schema tests. |
| 3 | Add commitment dialog | ✅ Done | `shared/components/commitments/schemas.ts`, `add-commitment-dialog.tsx` (`useForm`); tests `lib/__tests__/schemas.test.ts`. TS: `defaultValues` con `satisfies` + import `toCreateFixedCommitmentPayload`. |
| 4 | Docs + verify | ✅ Docs / ⚠️ E2E | Maestro §6.4 + este log. `pnpm typecheck` exit 0; Vitest scope P1 (9 files, 57 tests) exit 0. `pnpm test:e2e:smoke` parcial (env Playwright). |
| — | Extra: new goal dialog | ✅ Done | `modules/savings/schemas.ts`, `new-goal-dialog.tsx` (fuera del defer original). |

---

## Implementation alternatives

### Approach A: “Surgical” (mínimo diff)

Migrar solo los tres P1 sin shared abstractions; Zod schemas nuevos por módulo; copiar estructura de auth inline.

- **Effort:** S  
- **Risk:** Med — duplicación Field wiring  
- **Pros:** Ship rápido, bajo blast radius  
- **Cons:** No evita el próximo god component  

### Approach B: “Canonical kit” (recomendado)

P1 + extraer helpers delgados en `shared/lib/forms/` (ej. `formFieldApi` typings, documento en maestro) y subcomponentes por flujo (`income-register-form.tsx`, hooks `useIncomeRegisterForm`). Schemas en `modules/*/schemas.ts`.

- **Effort:** M  
- **Risk:** Low  
- **Pros:** DRY, onboarding futuro copia un solo lugar  
- **Cons:** ~1–2 días humano / ~1 sesión CC  

### Approach C: “Big bang”

Migrar onboarding + settings + todos los dialogs en un PR.

- **Effort:** L/XL  
- **Risk:** High — regresiones E2E y UX quincena  
- **Pros:** Uniformidad total  
- **Cons:** Viola ponytail; mezcla producto con refactor  

**Recommendation:** **Approach B** — completeness en P1 blast radius, sin boil-the-ocean onboarding.

---

## Recommended approach (B) — tasks

### Phase 1 — Schemas + income

1. Add `modules/income/schemas.ts` — Zod: `amountCents` (min/max), `source`, `concept` max length, `occurredAt` (Lima day, not future if product rule).
2. Split `IncomeRegisterFlow`: container (queries, mutation, step success) + `IncomeRegisterForm` with `useForm`.
3. Wire keypad, chips, date picker via `form.Field` / `setFieldValue`.
4. Map Convex errors to `form.setErrorMap` or banner (como auth `serverError`).
5. Vitest: schema edge cases (mirror `__tests__/schemas` style).

### Phase 2 — Expense flow

1. `modules/expenses/schemas.ts` — amount, envelope, description optional rules.
2. Refactor `expense-register-flow.tsx` mirroring income; keep variant B UI split.

### Phase 3 — Shared commitments dialog

1. `shared/components/commitments/schemas.ts` or `modules/settings/schemas.ts` — reuse in Convex-aligned shapes (cents, dueDay 1–31).
2. Replace silent `return` validation with `FieldError` + disabled submit from form state.
3. Tests for schema.

### Phase 4 — Docs + lint

1. Update QUIPU-MASTER §6.4 + §6 checklist.
2. `pnpm typecheck`, `pnpm test`, `pnpm test:e2e:smoke`.

### Deferred (TODOS.md)

- `settings-allocations-editor` + onboarding allocation drafts (P3 defer).
- Extract `AuthInput` → generic `FormTextInput` (taste — optional).

~~`new-goal-dialog`~~ — migrado 2026-07-21 (`modules/savings/schemas.ts`).

---

## Architecture (ASCII)

```
┌─────────────────────┐     ┌──────────────────┐
│ *RegisterFlow       │     │ Convex mutation  │
│  useQuery summary   │────▶│ create*Event     │
│  step/result UI     │     └──────────────────┘
└─────────┬───────────┘
          │ props: onSuccess
          ▼
┌─────────────────────┐
│ *RegisterForm       │
│  useForm + Zod      │
│  Field components   │
│  preview useMemo    │──▶ lib/* pure (unchanged)
└─────────────────────┘
```

---

## Test plan

| Flow | Unit (Zod) | E2E |
|------|------------|-----|
| Income register | schema amount/source/date | smoke ingreso path |
| Expense register | schema amount/envelope | smoke gasto |
| Add commitment | dueDay bounds, cents | optional extend smoke |

Artifact path: `~/.gstack/projects/app-quipu/User-chore-quipu-2.0-test-plan-20260721.md` (mirror on implement).

---

## NOT in scope

- Variante C gasto automático.
- Cambiar contratos Convex.
- Storybook de forms.

---

## Failure modes

| Mode | Mitigation |
|------|------------|
| Double submit | `form.state.isSubmitting` + disable button |
| Preview desync | preview reads `form.useStore` / subscribe amount field |
| Zod ≠ Convex | share numeric bounds constants from `core/` or duplicate test vectors |
| E2E selectors break | keep role/label text estable (constants) |

---

## GSTACK CEO REVIEW (Phase 1 summary)

**Mode:** SELECTIVE EXPANSION (fix blast radius, defer onboarding).

**Premises:** Accepted pending user gate (see above).

**Dream state delta:** Tras este plan, todo registro de dinero/compromiso pasa por el mismo patrón que auth; nuevas pantallas no inventan `useState` por campo.

**6-month regret:** Si solo migramos income y dejamos dialogs viejos, la deuda vuelve en 3 meses — por eso P1 incluye commitment dialog.

**Outside voices:** Codex CLI not verified this session — primary review only `[single-model]`.

---

## GSTACK DESIGN REVIEW (Phase 2 summary)

**UI scope:** Yes (forms, dialogs, keypad).

**Completeness:** 8/10 — plan names error display (`FieldError`) but should explicitly require **mismo copy** que hoy (español peruano, no mensajes Zod genéricos en inglés).

**States:** loading (`isSubmitting`), validation inline, server error banner — specified.

**Pass:** No visual redesign; behavior-preserving refactor.

---

## GSTACK ENG REVIEW (Phase 3 summary)

**Scope challenge:** God components are real; splitting is justified. `@hookform/resolvers` unused — do not add.

**Security:** Client Zod is not authz; Convex mutations remain source of truth — OK.

**Critical:** Silent validation failure in `add-commitment-dialog` is a UX bug today — fixing via form is P1.

**Test gap:** Add schema tests before UI refactor (TDD slice).

---

## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|------------------|-----------|-----------|----------|
| 1 | CEO | Approach B | Mechanical | P1 completeness | Kit + P1 trio | A too duplicate, C too big |
| 2 | CEO | Defer onboarding | Mechanical | P3 pragmatic | Out of blast radius | C |
| 3 | CEO | Update maestro §6.4 | Taste | P1 | Aligns with builder; was 3+ rule | Keep old maestro text |
| 4 | Eng | No react-hook-form | Mechanical | P4 DRY | Already on TanStack | Introduce RHF |
| 5 | Design | Keep visual parity | Mechanical | P5 explicit | Refactor only | Redesign forms |
| 6 | Eng | Schema tests first | Mechanical | P1 | Prevent Zod/Convex drift | UI-first |

---

## Cross-phase themes

**Validation visibility:** CEO + Eng flagged silent failures in commitment dialog — high confidence.

---

## GSTACK REVIEW REPORT

- CEO: SELECTIVE EXPANSION, 6 audit rows, premises need human confirm  
- Design: 8/10, error copy called out  
- Eng: architecture split approved, test-first for schemas  
- DX: skipped (no developer-facing API)  
- **Ready for final gate after premise confirmation**
