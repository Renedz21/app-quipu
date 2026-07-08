# Quipu v2.5 — Trabajo pendiente (documento vivo)

> **Propósito:** mapa vivo del trabajo pendiente, parcial y deuda técnica que dejó la migración v2.0 → v2.5 de Quipu (rama `chore/quipu-2.0`). Es la **fuente de verdad** para que cualquier agente (humano o IA) sepa **qué falta, por qué, y cómo hacerlo a nivel micro**. No es un plan descartable: se actualiza a medida que se cierran items o se descubren nuevos pendientes.
>
> **Cómo usar este documento:**
> 1. Antes de empezar cualquier tarea nueva, revisalo. Si encontrás algo que toca, marcalo.
> 2. Cada item está escrito como **mini-plan ejecutable** (interfaces, archivos, código, tests, commit). Tomá un item, seguí los pasos, marcalo como `[x]` al cerrar.
> 3. Si descubrís un pendiente nuevo durante el trabajo, agregalo en la prioridad que corresponda.
> 4. No muevas items entre prioridades sin discutirlo.
>
> **Convención de status:** `- [ ]` pendiente, `- [~]` en progreso, `- [x]` cerrado, `- [!]` bloqueado.
>
> **Convención de prioridad:** P0 (blocker del merge a main), P1 (próximo a hacer), P2 (backlog).

---

## Contexto de la rama actual

**Branch:** `chore/quipu-2.0`
**Commits relevantes:**
- `b70dda1` — Phase 1: widened schema con `totalIncomeReceived`, `incomeEvents`, `dueDay`+índice.
- `7f314b2` — Phase 2: helpers de backfill + 4 mutations idempotentes.
- `4a4f0aa` — Phase 3 part 1: `ConvexError` en todo, `createProfile` con `incomeModel`, `createFixedCommitment` con `dueDay`, TDD helpers.
- `f48f27b` — Phase 3 part 2: `createIncomeEvent` + `deleteIncomeEvent` + coach suggest-only.
- `8a04b03` — Phase 3 part 3: `FREE_PLAN_MONTHLY_LIMIT` eliminado, `paydayEngine.ts` borrado, tabla `adHocIncomes` y campos viejos de `financialCycles` eliminados.

**Estado de campos del schema v2.5:**
| Campo | Status actual | Comentario |
|---|---|---|
| `profiles.incomeModel` | `v.optional` | Debe pasar a `v.union` (required) cuando onboarding v2.5 exista. |
| `profiles.workerType` | `v.optional` | Pendiente eliminar tras onboarding v2.5. |
| `profiles.payFrequency` | `v.optional` | Correcto: opcional para `variable`. |
| `profiles.paydays` | `v.optional` | Correcto: opcional para `variable`. |
| `financialCycles.totalIncomeReceived` | `v.optional` | Debe pasar a required. |
| `fixedCommitments.frequency` | `v.optional` | Pendiente eliminar tras usar `dueDay` en toda la UI. |
| `fixedCommitments.dueDay` | `v.optional` | Debe pasar a required. |
| `incomeEvents` table | OK, completa | — |

---

## P0 — Blockers del merge a main

### P0-1: Smoke test manual del browser (Phase 1, Task 6 step 4)

- [ ] **Status:** Pendiente. **Owner:** usuario. **Bloquea:** P0-2 (decisiones de onboarding dependen de qué flujos se rompieron).

**Por qué existe:** la migración Phase 1 (widen) se deployó a dev y la app no se rompió en typecheck, pero **no se hizo el smoke manual en el navegador**. Cualquier flujo que leyera los campos viejos podría haberse roto silenciosamente.

**Qué hacer (paso a paso):**

1. Levantar Convex dev y Next dev:
   ```bash
   npx convex dev   # terminal 1
   pnpm dev         # terminal 2
   ```
2. Abrir `http://localhost:3000/sign-in`.
3. Sign-in con un passkey existente (o crear cuenta nueva).
4. Verificar end-to-end:
   - Dashboard carga con sobres y ciclo.
   - Registrar un gasto → sobres bajan correctamente.
   - Resolver una `coachInteraction` pendiente.
   - Verificar que `getMyProfile` retorna un profile (no falla por `workerType` undefined).
5. Si algo falla, capturar el error y abrir un sub-item en este documento bajo P2 con la firma del error.
6. Si todo pasa, marcar este item `[x]`.

**Criterio de cierre:** los 4 flujos pasan sin error de runtime, y los datos en Convex dashboard siguen siendo consistentes.

---

### P0-2: Onboarding v2.5 (consume `incomeModel`, no `workerType`)

- [ ] **Status:** Pendiente. **Owner:** TBD. **Bloquea:** P0-3 (no se puede endurecer campos hasta que no haya profiles con `incomeModel` set).

**Por qué existe:** el plan original `2026-07-07-domain-v25-migration.md` (en este mismo directorio) lo dejó explícito como follow-up. La UI actual de onboarding sigue mandando `workerType` y la firma vieja de `createProfile`, que fue cambiada en el commit `4a4f0aa`. La mutation actual **rechaza** payloads con `workerType` y exige `incomeModel` + `payFrequency`/`paydays` condicionalmente.

**Filosofía que debe reflejar (decidida en conversación previa):**

> Quipu no pregunta cuánto ganas. Pregunta cómo recibes tus ingresos. Y luego registra el primer ingreso real que arranca el ciclo.

**Onboarding debe preguntar:**
1. Nombre (igual que ahora).
2. País + moneda (default `Perú` + `S/`).
3. **¿Cómo recibes tus ingresos?** → 3 opciones:
   - "Tengo fechas de pago conocidas" → `incomeModel: "fixed"`
   - "Mis ingresos son variables" → `incomeModel: "variable"`
   - "Tengo ambos" → `incomeModel: "mixed"`
4. **Según la opción anterior, en este orden:**
   - Si `fixed` o `mixed`: ¿con qué frecuencia te pagan? (`monthly` o `biweekly`) + ¿qué días? (1-31, 2 si biweekly).
   - Si `variable`: ¿horizonte? (`15` o `30` días). v2.5 inicial: hardcoded en `HORIZON_DAYS = 15` en `convex/incomeEvents.ts`; si querés configurable, este item es el lugar.
5. Distribución 50/30/20 (o custom) — sliders o 3 inputs.
6. CTA: "Registra tu primer ingreso real".

**Archivos a crear/modificar (estimación inicial, refinar al ejecutar):**

- `app/(onboarding)/configurar/page.tsx` — server component, lee estado.
- `app/(onboarding)/configurar/components/step-income-model.tsx` — client component, opción A/B/C.
- `app/(onboarding)/configurar/components/step-payday.tsx` — client component, para fixed/mixed.
- `app/(onboarding)/configurar/components/step-horizon.tsx` — client component, para variable.
- `app/(onboarding)/configurar/components/step-allocations.tsx` — sliders de distribución.
- `app/(onboarding)/configurar/components/step-first-income.tsx` — input de monto, source, descripción → llama `createIncomeEvent`.
- `app/(onboarding)/configurar/components/onboarding-form.tsx` — orquesta los steps (state machine: useReducer o zustand).
- `modules/onboarding/actions.ts` — wrapper de `createProfile` + `createIncomeEvent`.
- `modules/onboarding/schemas.ts` — Zod schemas con validación condicional.
- `modules/onboarding/types.ts` — view models.

**Backend que ya está listo para consumir (no tocar):**
- `api.profiles.createProfile` (firma nueva con `incomeModel`).
- `api.incomeEvents.createIncomeEvent` (acepta `source`, `description`, `occurredAt`).
- `convex/lib/incomeEventLogic.ts` (resolver ciclo).

**Tests a escribir (TDD donde aplique):**
- `modules/onboarding/schemas.test.ts` — validación condicional según `incomeModel`.
- (Smoke manual del flow completo en browser.)

**Criterio de cierre:**
- Un usuario nuevo puede hacer onboarding completo y terminar con un profile + cycle + envelopes + 1 incomeEvent.
- La mutation `createProfile` recibe `incomeModel` (no `workerType`).
- La mutation `createIncomeEvent` se llama al final del onboarding con el primer ingreso real.

**Commits esperados:** múltiples. Un commit por step del wizard, idealmente.

---

### P0-3: Endurecer campos nuevos como required

- [ ] **Status:** Pendiente. **Owner:** TBD. **Depende de:** P0-2 cerrado.

**Por qué existe:** los 3 campos nuevos del schema v2.5 siguen como `v.optional` para no romper la UI de onboarding vieja. Una vez que P0-2 esté cerrado, todos los profiles nuevos van a tener estos campos seteados, y se puede endurecer el schema.

**Qué hacer (paso a paso):**

1. **Verificar pre-flight:** correr `convex/migrations.ts:backfillProfilesV25` y `backfillCommitmentsV25` (existen, ya funcionan) en el dashboard contra prod-data. Confirmar que retornan `0` la segunda vez (idempotencia OK).
2. **Endurecer `profiles.incomeModel`:**
   - En `convex/schema.ts`, cambiar `incomeModel: v.optional(...)` a `incomeModel: v.union(...)`.
3. **Endurecer `financialCycles.totalIncomeReceived`:**
   - En `convex/schema.ts`, cambiar `totalIncomeReceived: v.optional(v.number())` a `totalIncomeReceived: v.number()`.
4. **Endurecer `fixedCommitments.dueDay`:**
   - En `convex/schema.ts`, cambiar `dueDay: v.optional(v.number())` a `dueDay: v.number()`.
5. **Smoke check:** `pnpm tsc --noEmit` debe pasar. Si hay inserts que no setean estos campos (ej. código legacy en módulos no migrados), arreglarlos.
6. **Commit:**
   ```bash
   git add convex/schema.ts
   git commit -m "feat(schema): require v2.5 fields"
   ```

**Criterio de cierre:** los 3 campos son required en el schema, typecheck verde, Convex deploya OK.

---

### P0-4: Eliminar `workerType` y `frequency` del schema

- [ ] **Status:** Pendiente. **Owner:** TBD. **Depende de:** P0-2 cerrado y P0-3 cerrado.

**Por qué existe:** una vez que nada lee ni escribe `workerType` (en `profiles`) ni `frequency` (en `fixedCommitments`), se pueden eliminar del schema.

**Pasos:**

1. **Búsqueda exhaustiva:**
   ```bash
   grep -rn "workerType\|profile\.frequency\|fixedCommitments\.frequency" --include="*.ts" --include="*.tsx" .
   ```
2. **Si hay referencias**, eliminarlas. Puntos típicos donde quedaron:
   - Algún módulo UI que renderiza un form viejo.
   - Algún wrapper `actions.ts` que pasa el campo.
   - Algún seed de dev.
3. **Eliminar del schema** (`convex/schema.ts`):
   - Borrar línea `workerType: v.optional(...)` en `profiles`.
   - Borrar línea `frequency: v.optional(...)` en `fixedCommitments`.
4. **Borrar índice obsoleto** (si quedó): el `by_profile_dueDay` debe ser el único índice de `fixedCommitments` (más `by_profileId`).
5. **Eliminar referencias en `convex/migrations.ts`** — los `?? "monthly"` defensivos que quedaron.
6. **Typecheck + tests + Convex deploy.**

**Commit:**
```bash
git commit -m "refactor(schema): remove v2.0 workerType and frequency"
```

**Criterio de cierre:** `grep` no encuentra `workerType` ni `.frequency` en código, schema limpio, todo verde.

---

### P0-5: Rutas mínimas `/onboarding` y `/dashboard` para que los redirects post-auth no rompan

- [ ] **Status:** Pendiente. **Owner:** TBD. **Bloquea:** P-2 (la pantalla de éxito del nuevo sign-up redirige a `/onboarding` y sin esa ruta hace 404).

**Por qué existe:** el rediseño de auth (ver spec `2026-07-08-auth-v25-redesign-design.md` en `docs/superpowers/specs/`) requiere que el post-éxito redirija a `/onboarding` (usuario nuevo) o `/dashboard` (usuario con profile). Hoy esas rutas no existen; el `redirect` de Next tira 404. Hay que crear placeholders mínimos antes de mergear el rediseño de auth.

**Qué hacer (paso a paso):**

1. **Crear `app/(app)/onboarding/page.tsx`** (server component, server-side gate):
   - Lee sesión con `isAuthenticated` y `getToken`.
   - Si no hay sesión → `redirect("/sign-in")`.
   - Lee profile con `fetchAuthQuery(api.profiles.getMyProfile, {})`.
   - Si ya hay profile → `redirect("/dashboard")`.
   - Si no hay profile → renderiza placeholder: "Onboarding (próximamente)" + link a docs. No se implementa el wizard acá; eso es P0-2.
2. **Crear `app/(app)/dashboard/page.tsx`** (server component, server-side gate):
   - Lee sesión con `isAuthenticated` y `getToken`.
   - Si no hay sesión → `redirect("/sign-in")`.
   - Lee profile con `fetchAuthQuery(api.profiles.getMyProfile, {})`.
   - Si no hay profile → `redirect("/onboarding")`.
   - Si hay profile → renderiza placeholder: "Dashboard (próximamente)". No se implementa acá; eso es otra historia.
3. **Crear `app/(app)/layout.tsx`** que solo componga `<AppShell>` (placeholder, no implementar la sidebar). Verificar con P-3 que el grupo `(app)` respeta la convención de 2 niveles del `AGENTS.md`.
4. **Validar que los redirects de las páginas de auth funcionan end-to-end**:
   - Sign-up nuevo con passkey → status card → click "Configurar mi ciclo" → `/onboarding` (placeholder).
   - Sign-in con email/password y profile existente → `/dashboard` (placeholder).
   - Sign-in sin profile (usuario creado por passkey pero que no terminó onboarding) → `/onboarding`.
5. **Correr el smoke test del P0-1** que ahora debe pasar.

**Tests:**
- No requiere tests unitarios (placeholders). El criterio es manual.
- El integration test E2E (Playwright) si existe debe cubrir los 3 caminos. Si no existe, documentar en el smoke.

**Commits esperados:**
```bash
git commit -m "feat(app): add onboarding and dashboard placeholder routes"
```

**Criterio de cierre:** los 3 redirects de post-auth caen en un placeholder visible (no 404), y un usuario puede recorrer sign-up → onboarding → (vuelve a iniciar sesión) → dashboard sin error de runtime.

---

## P1 — Próximo a hacer (post-merge a main)

### P1-1: Motor de cascada de compromisos para `mixed`/`variable`

- [ ] **Status:** Pendiente. **Owner:** TBD.

**Por qué existe:** el commit `f48f27b` agregó `createIncomeEvent` con lógica de ciclo correcta, pero **no** implementa la "cascada" que discutimos: cómo se financia un `fixedCommitment` desde uno o varios `incomeEvents` hasta que quede cubierto. En `fixed` es trivial (lo descuenta del próximo sueldo), pero en `mixed`/`variable` requiere sumar incomeEvents hasta llegar al monto del compromiso.

**Diseño esperado (de la conversación previa):**

> El compromiso vive en el calendario. El motor decide cuándo queda cubierto. Para `fixed` se descuenta del ingreso que cae antes del `dueDay`. Para `variable`/`mixed`, se suman los `incomeEvents` que caen en la ventana hasta que el compromiso quede financiado.

**Archivos a crear/modificar:**

- `convex/commitments/coverage.ts` — función pura `computeCommitmentCoverage({ commitment, cycle, incomeEvents, now })` que retorna `{ covered: boolean, remaining: number, fundingEvents: Id<"incomeEvents">[] }`. **TDD con casos: covered fully, partial, not started, overdue.**
- `convex/commitments/coverage.test.ts` — tests.
- `convex/coachEngine.ts` — nuevo `getCommitmentCoverage` query que use el helper puro.
- `convex/incomeEvents.ts:createIncomeEvent` — después de insertar el event, disparar la cobertura: si el event hace que un compromiso quede cubierto, marcar el compromiso como `coveredAt: v.optional(v.number())` (campo nuevo a agregar en schema cuando se ejecute este item).
- `modules/dashboard/components/commitment-coverage-card.tsx` — UI que muestra el progreso.
- `shared/lib/commitments.ts` — helpers de formato (cuánto falta, cuántos días).

**Schema change necesario:**

- Agregar `coveredAt: v.optional(v.number())` a `fixedCommitments`.
- Considerar agregar `coveredBy: v.optional(v.array(v.id("incomeEvents")))` para trazabilidad.

**Tests a escribir:**
- `computeCommitmentCoverage` con `dueDay` vencido y sin incomeEvents → `{ covered: false, remaining: amount, fundingEvents: [] }`.
- `computeCommitmentCoverage` con `dueDay` futuro e incomeEvents parciales → `{ covered: false, remaining: 200, fundingEvents: [e1, e2] }`.
- `computeCommitmentCoverage` con incomeEvents que suman exacto → `{ covered: true, remaining: 0, fundingEvents: [e1, e2, e3] }`.

**Criterio de cierre:** cuando se crea un `incomeEvent`, los compromisos cuya `dueDay` ya pasó o está dentro de la ventana actual se evalúan y se marcan como cubiertos si aplica. UI muestra el progreso real.

---

### P1-2: `applyRescueTransfer` mutation + UI del coach con confirmación

- [ ] **Status:** Pendiente. **Owner:** TBD.

**Por qué existe:** el commit `f48f27b` cambió el coach para que **sugiera** en vez de aplicar, pero la mutation que efectivamente aplica la transferencia tras la confirmación del usuario no existe. La UI tampoco está.

**Diseño esperado:**

> El coach sugiere. El usuario confirma o rechaza. Solo tras la confirmación, la transferencia se aplica.

**Archivos a crear/modificar:**

- `convex/coachEngine.ts` — nueva mutation `applyRescueTransfer`:
  ```ts
  args: { interactionId: v.id("coachInteractions") }
  // 1. Auth + ownership check
  // 2. Leer la suggestion que quedó guardada en initialNudge (parsear) o re-calcularla
  // 3. Validar que savings.remainingAmount >= transfer y wants.remainingAmount < 0
  // 4. Patch savings y wants
  // 5. Marcar la interaction como "applied"
  ```
- `convex/coachEngine.ts` — nueva mutation `dismissRescueSuggestion` (rechaza la sugerencia).
- `modules/coach/components/rescue-confirm-dialog.tsx` — UI de confirmación con 2 botones.
- `modules/coach/actions.ts` — wrappers.
- `modules/coach/schemas.ts` — Zod.

**Criterio de cierre:** el coach muestra la sugerencia, el usuario confirma, la transferencia se aplica atómicamente. Si el usuario rechaza, no se aplica nada y la interaction queda como `resolved` con `mode: "dismissed"`.

---

### P1-3: Actualizar `docs/arquitectura.md` al modelo v2.5

- [ ] **Status:** Pendiente. **Owner:** TBD.

**Por qué existe:** `docs/arquitectura.md` todavía tiene ejemplos desactualizados:

- Menciona `modules/payday/` y `processPaydayAction` como ejemplo canónico (líneas ~127-145, ~159). Esos ya no existen — `convex/paydayEngine.ts` fue borrado en el commit `8a04b03`.
- Probablemente menciona `workerType` en alguna sección de modelo de datos (verificar con grep).

**Pasos:**

1. `grep -n "paydayEngine\|processPayday\|workerType\|frequency" docs/arquitectura.md` para localizar referencias.
2. Reemplazar ejemplos con `incomeEvents.createIncomeEvent` y `profiles.incomeModel`.
3. Actualizar la sección de modelo de dominio para reflejar:
   - `incomeModel: fixed | variable | mixed` en vez de `workerType`.
   - `incomeEvents` como log unificado de ingresos.
   - `dueDay` para compromisos.
4. Si hay decisiones explícitas contradictorias con v2.5, discutirlas antes de cambiar.

**Criterio de cierre:** el doc no contiene ninguna referencia a `workerType`, `processPayday`, o `paydayEngine`.

---

## P2 — Backlog

### P2-1: Limpiar `docs/` del `.gitignore` o decidir política

- [ ] **Status:** Pendiente. **Owner:** usuario (decisión).

**Por qué existe:** `docs/migrations/` y `docs/superpowers/` están en `.gitignore`. Los runbooks y planes que ahí viven **no se pushean al remote**, solo viven en local. Eso está bien para notas personales, pero **los runbooks de migración** son útiles para el equipo.

**Opciones:**

- A. Sacar `docs/` del `.gitignore`. Implica commitear planes y runbooks a la rama. Pro: cualquier dev puede verlos. Contra: ruido en el repo.
- B. Mantener `docs/` ignorado y mover los runbooks críticos a `convex/migrations/README.md` (dentro del código). Pro: van con el código. Contra:分散.
- C. Mantener `docs/` ignorado y aceptar que los runbooks son locales.

**Recomendación actual:** A, con un `.gitignore` más quirúrgico que ignore solo `docs/superpowers/sdd/progress.md` (que es el ledger local de SDD, no debe commitearse).

**Pasos si se elige A:**

1. Editar `.gitignore`, cambiar la línea de `docs/` para que ignore solo paths específicos.
2. `git add docs/migrations/2026-07-07-v25-migration.md`.
3. `git add docs/superpowers/plans/2026-07-08-v25-pending-work.md` (este mismo documento).
4. Commit:
   ```bash
   git commit -m "chore: unignore docs except local SDD progress"
   ```

---

### P2-2: Decidir si `HORIZON_DAYS` se mantiene hardcoded o se vuelve configurable

- [ ] **Status:** Pendiente. **Owner:** TBD. **Depende de:** UX discussion.

**Por qué existe:** `convex/incomeEvents.ts` tiene `const HORIZON_DAYS = 15` hardcoded para `incomeModel === "variable"`. La conversación previa dejó 15 o 30 como opciones, configurable desde Ajustes con efecto "a partir del siguiente ciclo".

**Opciones:**

- A. Dejarlo hardcoded en 15 hasta tener telemetría. **Recomendación actual.**
- B. Agregar campo `cycleHorizonDays: v.optional(v.union(v.literal(15), v.literal(30)))` a `profiles` y leerlo en `createIncomeEvent`.
- C. Convertirlo en preferencia global en `core/constants.ts`.

**Criterio de decisión:** si no hay datos que justifiquen configurable, A. Si hay UX research que muestre que 30 días es significativamente mejor para algunos usuarios, B.

---

### P2-3: Auditoría de UI: ¿qué vistas leen los campos viejos?

- [ ] **Status:** Pendiente. **Owner:** TBD.

**Por qué existe:** el typecheck pasó porque la mayoría del frontend está en el árbol dirty/no-commiteado. Pero las vistas que sí están commiteadas pueden tener bindings a `profile.workerType` o `commitment.frequency` que no se ven en el typecheck de Convex.

**Pasos:**

1. `grep -rn "workerType\|frequency" app/ modules/ shared/ --include="*.ts" --include="*.tsx"` (excluir `convex/`).
2. Para cada hit, decidir:
   - Si la vista está activa → migrar a `incomeModel` / `dueDay`.
   - Si la vista es legacy/no-usada → borrar.
3. Commit por vista migrada.

---

## Cómo agregar un nuevo pendiente a este documento

1. Decidir prioridad: ¿bloquea merge a main? → P0. ¿próximo sprint? → P1. ¿backlog? → P2.
2. Copiar el template de abajo y rellenar.
3. Mantener el orden: P0 primero, dentro de P0 los más bloqueantes primero.

**Template:**

```markdown
### PX-N: [Título breve]

- [ ] **Status:** Pendiente. **Owner:** TBD. **Bloquea/Depende de:** [otros items]

**Por qué existe:** [1-2 oraciones del problema/origen.]

**Archivos a crear/modificar:**
- `[path]`

**Pasos:**
1. [paso concreto]
2. [paso concreto]

**Criterio de cierre:** [qué tiene que ser verdad para marcar como hecho.]

**Commit esperado:** `git commit -m "..."`
```

---

## Changelog de este documento

- **2026-07-08** — Creación inicial post-migración. Items P0-1 a P0-4, P1-1 a P1-3, P2-1 a P2-3. Owner del documento: el branch `chore/quipu-2.0`.
