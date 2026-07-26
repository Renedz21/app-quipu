# Spec: Edición de movimientos + apartado de ingresos (neto distribuible)

> **Fecha:** 2026-07-26 · **Estado:** decisión de diseño (no implementado)  
> **Producto:** Quipu v2.5+ · **Canon:** `docs/QUIPU-MASTER.md`  
> **Pregunta filtro:** ¿ayuda a decidir mejor con el próximo sol que entre? → Sí: corrige hechos erróneos del ciclo y evita repartir dinero que nunca estuvo disponible.

---

## 0. Contexto verificado en código

| Hecho | Evidencia |
|---|---|
| Ingresos/gastos no tienen `update*` | Solo `createIncomeEvent` / `deleteIncomeEvent` y `registerExpense` / `deleteExpense` |
| La UI no expone ni delete ni edit | `/movements` es lista read-only; delete mutations existen sin UI |
| `expenses` documentados como inmutables | `QUIPU-MASTER` §5.1 |
| `distributionApplied` es verdad histórica | Nunca se recalcula al cambiar % del perfil; se usa para revertir deletes |
| Compromisos **no** se descuentan antes del 50/30/20 | `createIncomeEvent` reparte `args.amount` completo; cobertura P1-1 es cascada informativa/persistida sobre lo ya repartido |
| Comentario legacy en schema contradice el dominio | `schema.ts`: «Descontados atómicamente antes de calcular el 50/30/20» — **falso hoy**; el audit 2026-07-07 decidió lo contrario a propósito |

Tensión de producto: el audit v2.5 modeló compromisos como *objetivos visibles*, no como descuentos automáticos. El caso del usuario (S/ 3,500 entran pero S/ 2,500 ya están obligados) es distinto: ese dinero **nunca fue disponible** para disciplina 50/30/20. Sin un mecanismo de apartado, el usuario “hace trampa” registrando S/ 1,000.

---

## 1. Problema 1 — Edición de ingresos y gastos

### 1.1 Objetivo

Permitir corregir hechos del **ciclo activo** (monto, descripción, sobre en gastos; monto/fecha/origen/política en ingresos) y recalcular derivados sin dejar sobres, cobertura ni snapshots inconsistentes.

### 1.2 Cambios de base de datos

| Tabla | Cambio | Motivo |
|---|---|---|
| `expenses` | `updatedAt?: number` | Trazabilidad mínima; Convex ya da `_creationTime` |
| `incomeEvents` | `updatedAt?: number` | Idem |
| Ambas | **Sin** tabla de historial de cambios en v1 | YAGNI: corregir captura ≠ auditoría contable; delete+recreate ya pierde menos valor que un ledger |

No se añade `createdAt` propio: `_creationTime` basta.

**Regla facts-over-derivations (ajuste puntual):**

- Al **editar el monto/política** de un `incomeEvent`, sí se **recalcula** `distributionApplied` de ese evento (el hecho cambió).
- **No** se recalcula `distributionApplied` de otros eventos cuando el usuario cambia % en Ajustes (sigue la regla actual).

### 1.3 Cambios en Convex

Nuevas mutations (mismo estilo de auth/guards que delete):

- `expenses.updateExpense` — ciclo activo, ownership, monto entero > 0.
- `incomeEvents.updateIncomeEvent` — ciclo activo; revalida habitual vs extraordinario como en create.

Refactor interno recomendado (no API pública):

```
rebuildCycleEnvelopeBalances(cycleId)
  allocated[type] = Σ income.distributionApplied[type]  (+ coverageBoost / moves si aplica)
  spent[type]     = Σ expenses en ese sobre
  remaining       = allocated - spent ± rescue/surplus patches ya modelados
```

Usar rebuild en create/update/delete de ingresos y gastos del ciclo activo evita drift por patches delta (hoy delete/create aplican deltas; con edición el riesgo de inconsistencia sube).

También:

- Tras update/delete de ingreso → `evaluateCommitmentCoverageForCycle`.
- Tras update de ingreso que cambia `occurredAt` fuera de la ventana del ciclo activo → **rechazar** (no mover de ciclo en v1; evita cerrar/abrir ciclos por typo).
- Ciclo `closed` → rechazo (igual que delete hoy).

### 1.4 Lógica de negocio

**Gasto — `updateExpense`:**

1. Validar ciclo activo + ownership.
2. Si cambia `envelopeType`: mover el cargo al sobre destino.
3. Rebuild (o patch simétrico) de `remainingAmount`.
4. `updatedAt = now`.
5. Coach wants-burn: reevaluar solo si el sobre involucrado es `wants` (no spamear nudges; misma dedupe que register).

**Ingreso — `updateIncomeEvent`:**

1. Validar campos (mismas reglas que create).
2. Calcular `distributableCents` (ver §2) y nuevo `distributionApplied`.
3. Patch evento + `totalIncomeReceived` (sigue siendo **bruto** Σ `amount`).
4. Rebuild sobres del ciclo.
5. Reevaluar cobertura de compromisos.
6. Si el rebuild deja `remaining < 0` en un sobre porque ya se gastó más de lo nuevo asignado: **permitir** (Quipu ya tolera overspend; es señal de verdad, no bloqueo). Opcional UX: warning en confirmación «Este cambio deja Gustos en −S/ X».

**Integridad:**

- Una sola fuente de verdad materializada: sobres derivados de hechos del ciclo.
- `distributionApplied` del evento editado se actualiza; los demás eventos no.
- No editar ciclos cerrados (preserva `cycleHistory` / rachas).

### 1.5 UI

| Superficie | Cambio |
|---|---|
| `/movements` | Tap en ítem → sheet detalle + **Editar** / **Eliminar** (eliminar ya tiene backend) |
| Editar gasto | Reusar keypad + selector de sobre (Bloque 4), prefilled |
| Editar ingreso | Reusar flujo Bloque 5 en modo edit (preview de deltas vs estado actual) |
| Confirmación | Copy: «Corregimos el registro. Tus sobres se actualizaron.» + nuevos saldos |
| Ciclo cerrado / sin ciclo | Sin acciones de edición |

Una pregunta por pantalla: el sheet responde «¿Qué corregimos de este movimiento?».

### 1.6 Casos límite

| Caso | Comportamiento |
|---|---|
| Editar gasto a monto 0 | Rechazar (usar eliminar) |
| Reducir ingreso por debajo de lo ya gastado en sobres | Permitir remaining negativo + warning en UI |
| Editar ingreso extraordinario ↔ habitual | Permitir si validación de campos pasa; recalcular política |
| Único ingreso del ciclo + borrar | Permitir; sobres en 0; ciclo activo vacío (empty states ya existen) |
| Ingreso que abrió el ciclo: editar `occurredAt` | v1: solo dentro de `[startDate, endDate)`; no recrear ciclo |
| Concurrent edits | Última mutation gana; rebuild idempotente mitiga |
| `surplusContributions` / rescue / `coverageBoost` | Rebuild debe reaplicarlos en orden documentado en implementación (tests) |
| Sub-sobre en gasto | Si existe path de gasto→ahorro, update restaura/reaplica `currentAmount` como delete |

### 1.7 Auditoría

**v1:** `updatedAt` + immutabilidad de ciclos cerrados.  
**No** historial append-only hasta que exista necesidad legal/contable (fuera de filosofía Quipu).

---

## 2. Problema 2 — Dinero comprometido antes de distribuir

### 2.1 El problema real (no el síntoma)

Ejemplo: entran S/ 3,500; S/ 2,500 pagan una deuda obligatoria; solo S/ 1,000 son disciplina 50/30/20.

Hoy Quipu reparte 3,500 → sobres inflados → disponibilidad mentirosa → usuario registra 1,000 a mano (rompe el hecho «cuánto entró»).

Esto **no** es lo mismo que un `fixedCommitment` de alquiler del día 5 financiado *después* del reparto vía cascada P1-1. Es dinero **no disponible** en el momento del evento.

### 2.2 Alternativas evaluadas

#### A. Reservar parte del ingreso al registrarlo (`heldCents` libre)

Campo opcional en el formulario: «¿Cuánto de esto ya está comprometido?»

| | |
|---|---|
| **Ventajas** | Simple; no obliga a mentir el bruto; un solo control; compatible con deudas one-shot sin compromiso en catálogo |
| **Desventajas** | Micro-pregunta extra; fácil olvidar el apartado; no conecta solo con cobertura |
| **Arquitectura** | `incomeEvents.heldCents`; repartir `amount - heldCents`; cobertura debe contar el held |
| **UX** | Un stepper/campo bajo el monto; preview muestra «Apartado / A repartir» |

#### B. Asociar ingreso ↔ compromiso(s) existente(s)

Al registrar, elegir qué compromisos cubre este ingreso y por cuánto.

| | |
|---|---|
| **Ventajas** | Trazabilidad fuerte; alinea con `coveredBy`; reusa catálogo |
| **Desventajas** | Microgestión (picker, splits); falla si la deuda no está en `fixedCommitments`; choca con «sin microgestión» |
| **Arquitectura** | Join/array en el evento; reescribir motor de cascada |
| **UX** | Formulario más largo; fricción en el momento más feliz (cobré) |

#### C. Reserva temporal hasta fecha

Apartar con `releaseAt`; luego liberar a sobres o marcar pagado.

| | |
|---|---|
| **Ventajas** | Flexible para plazos |
| **Desventajas** | Estado temporal, jobs/cron, edge cases de release; complejidad de producto alta |
| **Arquitectura** | Nueva entidad o campos + scheduler; fuera de KISS |
| **UX** | Calendario + estados «reservado/liberado» = ERP light |

#### D. Descontar automáticamente todos los `fixedCommitments` descubiertos antes del 50/30/20

Revertir la decisión del audit 2026-07-07: neto = ingreso − Σ compromisos del perfil.

| | |
|---|---|
| **Ventajas** | Cero fricción si el catálogo está completo y es exactamente «lo que sale del ingreso» |
| **Desventajas** | Mezcla obligaciones de calendario con “no disponible”; alquiler del día 20 no debería vaciar el 50/30/20 del día 1 entero; perfiles con compromisos > ingreso quiebran el ciclo; contradice modelo mental actual de cobertura |
| **Arquitectura** | Cambio profundo en create + coverage (doble conteo si no se rediseña) |
| **UX** | Mágico hasta que falla; poco explicable |

#### E. (Recomendada) Apartado inteligente = `heldCents` con default proactivo desde compromisos descubiertos

Híbrido A + default automático B-lite:

1. Usuario ingresa **bruto** S/ 3,500 (hecho).
2. Quipu calcula sugerencia: `suggestedHold = min(amount, Σ remaining de compromisos no cubiertos del ciclo)` ordenados por `dueDay` (reusa motor de cascada).
3. Preview: «S/ 2,500 quedan apartados para tus compromisos. Se reparte S/ 1,000.»
4. Usuario confirma o ajusta el apartado (un control, opcionalmente colapsado si suggestedHold = 0).
5. Persistencia: `heldCents` + `distributionApplied` sobre `distributable = amount - heldCents`.
6. Cobertura: el `heldCents` financia compromisos en cascada **antes** (o como fuente paralela) de lo asignado a needs/wants.

| | |
|---|---|
| **Ventajas** | Disciplina sobre dinero real; no mentir el ingreso; proactivo (coach de captura, no chat); un control; one-shots: usuario sube el hold manualmente o agrega el compromiso una vez; alinea filosofía §2.5 |
| **Desventajas** | Hay que extender cobertura para contar held; copy cuidadoso para no parecer que Quipu “pagó” la deuda |
| **Arquitectura** | Un campo (+ opcional lista derivada de funding); sin tablas nuevas; tests del motor de cobertura |
| **UX** | Automática cuando hay compromisos; simple cuando no |

#### F. Registrar dos hechos (bruto + gasto inmediato de deuda)

Ingreso 3500 + gasto needs 2500 en el mismo flujo.

| | |
|---|---|
| **Ventajas** | Reusa primitives |
| **Desventajas** | Infla needs del 50/30/20 (el 50% se calcula sobre 3500 y luego se gasta 2500 → distorsión peor); empuja microgestión de categoría |
| **Arquitectura** | Baja |
| **UX** | Dos pasos mentales; no responde «solo 1000 disponibles» |

---

## 3. Recomendación única

### Decisión: **Alternativa E — Apartado inteligente al registrar ingreso (`heldCents`)**

**Por qué (producto):**

1. Preserva el hecho «entraron S/ 3,500» (filosofía eventos, no nómina).
2. Trabaja sobre **neto realmente distribuible** sin pedir al usuario que falsifique.
3. Es **proactivo**: sugiere el apartado desde compromisos ya conocidos; no obliga a armar un spreadsheet.
4. Evita microgestión: un número ajustable, no asociación compromiso-a-compromiso obligatoria.
5. Pasa la pregunta filtro: el próximo sol se decide sobre disponibilidad verdadera.
6. Encaja con «el coach sugiere, el usuario confirma»: el default es sugerencia; el confirm es el opt-in.

**Por qué (técnico):**

1. Un campo en `incomeEvents` + cambio localizado en `createIncomeEvent` / futuro `updateIncomeEvent`.
2. Extiende el motor P1-1 en lugar de inventar reservas temporales o tablas nuevas.
3. Compatible con edición (§1): al editar monto/held se regenera `distributionApplied` y se reevalúa cobertura.
4. `totalIncomeReceived` sigue siendo bruto; «a repartir» es derivado en preview/UI.
5. Corrige el comentario falso del schema: los compromisos de calendario **siguen** sin descontarse ciegamente; solo el **apartado del evento** (sugerido o manual) reduce la base del 50/30/20.

### Semántica canónica

```
amount            = bruto que entró (céntimos > 0)
heldCents         = 0..amount  (default sugerido; usuario puede override)
distributable     = amount - heldCents
distributionApplied = policy(distributable)   // 50/30/20 u all_to_savings
```

Copy UI (orientativo):

- Label: «Ya comprometido»
- Ayuda: «No se reparte en tus sobres. Sirve para deudas u obligaciones que salen de este ingreso.»
- Preview líneas: Bruto · Apartado · A repartir → 3 sobres.

Ingresos extraordinarios: el apartado aplica **antes** de la política (CTS 100% ahorro se calcula sobre el distribuible).

### Qué no hacemos en v1

- Reservas con fecha de liberación.
- UI de split multi-compromiso obligatorio.
- Descontar automáticamente todo el catálogo de `fixedCommitments` sin confirmación.
- Historial append-only de edits.

### Orden de implementación sugerido

1. **P3-4a** — `heldCents` + create/preview/UI registro (sin edit).
2. **P3-4b** — Extender cobertura para financiar desde `heldCents`.
3. **P3-5** — `updateExpense` / `updateIncomeEvent` + UI en `/movements` + rebuild de sobres.
4. Actualizar §5 del maestro (schema, reglas, comentario legacy del schema).

### Criterios de aceptación (cuando se implemente)

- Registrar 3500 con hold 2500 → sobres suman 1000; `totalIncomeReceived` += 3500.
- Sin compromisos y hold 0 → comportamiento idéntico al actual.
- Sugerencia de hold = min(ingreso, descubierto de compromisos) en preview.
- Editar ingreso/gasto en ciclo activo actualiza sobres y cobertura; ciclo cerrado bloqueado.
- Tests TDD: allocations con hold, coverage con heldCents, rebuild de envelopes, update paths.

---

## 4. Relación con decisiones previas

| Decisión previa | Estado tras este spec |
|---|---|
| Audit 2026-07-07: no descontar compromisos del neto automáticamente | **Se mantiene** a nivel de catálogo/calendario |
| Nuevo: apartado **por evento de ingreso** (sugerido, confirmado) | **Se añade** como hecho del `incomeEvent` |
| `distributionApplied` nunca se recalcula | **Se acota**: no se recalcula por cambios de % globales; sí al editar el propio evento |
| Expenses «inmutables» | **Se relaja** solo en ciclo activo vía update explícito |
