# Ingresos extraordinarios + ahorro del ciclo (Bloques 5N / 6N) — Spec (2026-07-21)

> Extiende P1-8 y P1-9 sin reemplazarlos. Canon visual: `quipu-2.html` (secciones 5N y 6N).
> CEO review: Approach B (metadata en `incomeEvents` + reglas en perfil), SELECTIVE EXPANSION.
> Supersedes: nada. Complementa `2026-07-21-ingresos-bloque-5-design.md` y `2026-07-21-ahorros-bloque-6-design.md`.

## Problema y outcome

Usuarios con planilla peruana reciben montos puntuales (gratificación, CTS, bonos, utilidades) que
disparan la pregunta “¿a dónde va esto sin romper mi 50/30/20?”. Quipu debe permitir **etiquetar**
esos eventos, **sugerir** un reparto (reglas configurables) y **confirmar** un destino solo para
ese ingreso, dejando intacta la configuración del perfil.

Outcome medible: registrar una grati con destino explícito en <60 s; ver en Ahorros cuánto del ciclo
fue “objetivo” vs “adicional”; mover sobrante al Fondo sin confundirlo con rescate de crisis (P1-10).

## Principios (no negociables)

1. **Sigue siendo un `incomeEvent`.** No hay totales `base`/`extraordinary` en `financialCycles`.
2. **`distributionApplied` es hecho histórico** — nunca se recalcula al cambiar reglas o % del perfil.
3. **Reglas = sugerencias.** En el momento del registro el usuario puede cambiar destino (doble opt-in al confirmar).
4. **Quipu no es nómina.** No boletas, deducciones, AFP, proyecciones ni calendario laboral completo.
5. **Un solo Registrar.** Toggle Habitual / Extraordinario en `/income/register`; no árbol de rutas paralelo.
6. **Fondo primero en Ahorros.** La card “Tu ahorro este ciclo” vive **debajo** del hero Fondo en `/savings`.

## Alcance

### In scope (P2-7)

| Área | Entrega |
|------|---------|
| UI ingreso | Toggle, grid de tipos extraordinarios, badge dorado, flujo destino (3 opciones), preview + disponible hoy, confirmación dorada |
| Backend ingreso | Campos en evento + reglas en perfil; override de distribución validado en `createIncomeEvent` |
| Ajustes | Pantalla/sección Automatizaciones (`/settings/extraordinary` o sección en settings existente) |
| UI ahorros | Card ciclo (objetivo / adicional / total), CTA mover sobrante, modal/página mover, estado “ahorraste menos” |
| Backend ahorros | Mutación `moveSurplusToSavings` (nombre TBD) + query derivados del ciclo; TDD puro |
| Maestro + tokens | §2.5, §3, §5, §8 actualizados; tokens `--extraordinary-*` en `@theme` |
| Tests | Vitest dominio + smoke E2E flujo grati → confirmación → badge en movimientos |

### Deferred

- UI “Personalizar reparto” con sliders/montos por sobre (opción 5N-C con `›` sin pantalla).
- Automatizaciones en móvil (paridad web primero).
- Selector de fecha retroactiva para ingresos habituales (ya fuera de v2.5 base).

### Out of scope

- Sync bancaria / detección automática de grati.
- Recalcular eventos pasados.
- Segundo color verde para CTAs extraordinarios (dorado = categoría semántica, no CTA).

---

## Modelo de datos

### `incomeEvents` (extensión)

Campos nuevos (todos opcionales; ausencia = ingreso habitual legacy):

```ts
incomeKind: v.optional(v.union(v.literal("habitual"), v.literal("extraordinary"))),
extraordinaryType: v.optional(v.union(
  v.literal("gratification_july"),
  v.literal("gratification_december"),
  v.literal("cts"),
  v.literal("corporate_bonus"),
  v.literal("profit_sharing"),
  v.literal("custom"),
)),
// Solo si extraordinaryType === "custom": label usuario (trim, max 80)
extraordinaryLabel: v.optional(v.string()),
distributionPolicy: v.optional(v.union(
  v.literal("profile_default"),      // 50/30/20 del perfil
  v.literal("all_to_savings"),       // 100% al sobre Ahorro del ciclo
  // v.literal("custom_split")      // DEFER — reparto manual por sobre
)),
```

**Reglas:**

- Si `incomeKind === "extraordinary"`, `extraordinaryType` es **requerido** en mutación.
- `source` sigue siendo el enum existente; mapping UI → backend:
  - Tipos planilla → `source: "payroll"` + `description` canónica (ej. “Gratificación de julio”).
  - “Otro extraordinario” → `source: "other"` + `extraordinaryLabel`.
- `distributionApplied` se calcula en servidor según `distributionPolicy` (no confiar en cliente).

### `profiles` (extensión)

```ts
extraordinaryRules: v.optional(v.object({
  cts: v.union(
    v.literal("all_to_emergency_fund"),
    v.literal("profile_default"),
    v.literal("all_to_savings"),
    v.literal("ask_each_time"),
  ),
  gratifications: v.union(/* mismo union */),
  corporate_bonus: v.union(/* mismo union */),
  profit_sharing: v.union(/* mismo union */),
  custom: v.union(/* mismo union */),
})),
```

Default si ausente: `profile_default` para gratificaciones; `all_to_emergency_fund` para CTS (alineado al HTML demo). Defaults documentados en maestro §5.3.

`all_to_emergency_fund` en mutación: reparto 100% al sobre `savings` del ciclo **y** incremento directo de `subEnvelope` Fondo (`isSystemDefault`) vía misma lógica que aporte explícito, **o** solo sobre savings con copy “recomendado mover al Fondo” — **decisión eng:** preferir 100% a `savings` envelope en v1; en UI mover sugiere Fondo (menos magia silenciosa). Documentar en implementación.

### Derivados (no persistir en ciclo salvo excepción documentada)

Para `/savings` card “Tu ahorro este ciclo”:

| Métrica | Definición |
|---------|------------|
| **Ahorro objetivo** | Suma de `distributionApplied.savings` de todos los `incomeEvents` del ciclo activo donde `distributionPolicy !== "all_to_savings"` **o** proporción savings del habitual. Simplificación v1: `floor(totalIncomeReceived * allocationSavings/100)` usando snapshot del perfil al momento de cada evento — **preferir** sumar `distributionApplied.savings` de eventos (hechos). |
| **Ahorro adicional** | Suma de traslados explícitos ciclo (`moveSurplusToSavings`) + parte “extra” de eventos `all_to_savings` sobre el objetivo prorrateado — v1: `max(0, totalSavingsAllocated - savingsObjective)` donde `totalSavingsAllocated` = suma `distributionApplied.savings` + movimientos a sub-sobres desde sobres nec/want. |
| **Ahorro total** | `savingsObjective + savingsAdditional` (coherente con barra sólida/rayada del HTML). |

Implementar en `convex/lib/cycleSavingsBreakdown.ts` (TDD obligatorio). Query `savings.getCycleBreakdown` o extender `getOverview`.

### Mutaciones / queries nuevas

| API | Tipo | Rol |
|-----|------|-----|
| `createIncomeEvent` | mutation | Extender args con campos extraordinarios + policy; validar override |
| `updateExtraordinaryRules` | mutation | En `settings.ts` o `profiles.ts` |
| `moveSurplusToSavings` | mutation | `fromEnvelope: needs|wants`, `amount`, `toSubEnvelopeId` (Fondo default); solo ciclo activo; no altera allocation % del perfil |
| `getCycleSavingsBreakdown` | query | Objetivo / adicional / total + flags UI (“vas por encima de tu meta”) |

---

## Flujos UI

### Bloque 5N (misma ruta `/income/register`)

```text
[Toggle Habitual | Extraordinario]
  habitual → flujo P1-8 actual (sin cambios visibles salvo toggle)
  extraordinary →
    1. Grid tipos (6 cards + Otro)
    2. Form: monto, fecha (editable para extraordinario), nota opcional
    3. Card regla activa (desde profile) + enlace Cambiar → sheet destino
    4. Preview impacto + Nuevo disponible hoy
    5. Confirmar → éxito gradiente dorado + deltas
```

**Destino (sheet/modal 5N-C):**

1. Mi distribución habitual (recomendado)
2. Todo al ahorro
3. Personalizar este reparto → **disabled o “Próximamente”** en v1

**Movimientos / dashboard:** badge `Extraordinario` (dorado) en líneas con `incomeKind === "extraordinary"`.

### Bloque 6N (`/savings`)

Layout vertical:

1. Hero Fondo (sin cambios P1-9)
2. Sección **Tu ahorro este ciclo** (nuevo)
3. Otras metas (grid existente)

CTA desde ingreso 5N: “Prefiero ahorrar más de esta grati” → deep link a `/savings` con scroll a card ciclo o abrir mover.

**Mover (`/savings/move` o modal):**

- Origen: chips sobrante Gustos / Necesidades / “De mi gratificación” (solo si saldo identificable en Ahorro no asignado a sub — definir en eng)
- Destino: Fondo (recomendado) | meta custom
- Copy: “Solo por este ciclo. Tu 50/30/20 sigue igual.”

**Distinción P1-10:** `applyCoverFromCycleSavings` = crisis/compromisos; `moveSurplusToSavings` = voluntario, copy celebratorio, sin `coverageBoost`.

---

## Diseño (tokens)

Agregar a `app/globals.css` `@theme` (nombres orientativos):

| Token | Hex ref (HTML) | Uso |
|-------|----------------|-----|
| `--extraordinary-a` | `#B08430` | Icono, borde activo, check |
| `--extraordinary-b` | `#86651F` | Texto badge |
| `--extraordinary-surface` | `#F6EFDE` | Fondos suaves |
| `--extraordinary-border` | `#E8DABC` | Bordes |

No usar estos tokens para botones primarios globales. CTA sigue `--text-strong` / verde solo para estados “ok”.

---

## Errores (códigos semánticos)

| Código | Cuándo |
|--------|--------|
| `VALIDATION_ERROR` | Monto ≤0, tipo faltante, policy inválida, custom sin label |
| `UNAUTHORIZED` | Sin sesión |
| `NOT_FOUND` | Perfil / ciclo / sub-sobre |
| `INSUFFICIENT_ENVELOPE_BALANCE` | Mover más del sobrante disponible |

---

## Criterios de cierre (P2-7)

1. Maestro §2.5, §3.7 (bloques 5–6), §5, §8 reflejan esta spec.
2. Toggle + flujo extraordinario web y móvil (core steps; automatizaciones ajustes web).
3. Reglas persistidas y aplicadas como sugerencia en registro.
4. Card ciclo en `/savings` + mover sobrante + estado under-target.
5. TDD: `cycleSavingsBreakdown`, extensión tests `createIncomeEvent` policy overrides.
6. `pnpm tsc --noEmit`, `pnpm test --run`, lint en archivos tocados.
7. Smoke manual: grati → destino habitual → confirmación; CTS regla Fondo; mover desde Gustos.

## Orden de implementación sugerido

1. Schema widen + tipos generados + funciones puras policy/allocation.
2. `createIncomeEvent` + tests.
3. UI toggle + tipos + destino + preview paridad.
4. Settings extraordinary rules.
5. `cycleSavingsBreakdown` + UI card 6N.
6. `moveSurplusToSavings` + UI mover + confirmación.
7. Badges movimientos + copy under-target.

## Referencias

- `quipu-2.html` — bloques 5N (≈ L1367+) y 6N (≈ L1869+)
- `docs/QUIPU-MASTER.md` — §2.5, §3.7, §5
- CEO plan: `~/.gstack/projects/app-quipu/ceo-plans/2026-07-21-ingresos-extraordinarios.md`

---

## Eng review (2026-07-21) — decisiones cerradas

| Tema | Decisión |
|------|----------|
| Entrega | **F1** schema + `createIncomeEvent` + UI toggle/destino + reglas settings + badges. **F2** `surplusContributions` + `cycleSavingsBreakdown` + card 6N + `moveSurplusToSavings`. |
| Ledger sobrante | Tabla **`surplusContributions`**: `profileId`, `cycleId`, `fromEnvelope` (needs/wants), `amount`, `subEnvelopeId`, `createdAt`; índice `by_cycle`. |
| CTS / Fondo | `all_to_emergency_fund` **solo en perfil**; al confirmar evento → `distributionPolicy: all_to_savings` (100% sobre Ahorro ciclo); UI empuja mover al Fondo, sin auto-aporte silencioso. |
| Métricas ciclo | **Objetivo** = Σ `distributionApplied.savings` con `profile_default` o habitual (policy ausente). **Adicional** = Σ savings de `all_to_savings` + Σ `surplusContributions.amount`. **Total** = objetivo + adicional. |
| DRY reparto | **`shared/lib/allocations.ts`**: `computeAllocations` + `applyDistributionPolicy`; `convex/lib/budgetMath` re-export; `impactPreview` importa shared. |
