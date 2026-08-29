# Diseño: Vista "Mover más al ahorro" v2 — monto libre con input editable

**Fecha:** 2026-08-28
**Estado:** Aprobado (diseño en conversación)
**Alcance:** Solo frontend (`modules/savings`). Sin cambios en Convex.

## Problema

En `modules/savings/components/move-surplus-form.tsx`, el usuario solo puede
elegir montos vía slider + atajos (+S/ 100, +S/ 300, Todo el sobrante). El
monto inicial es **todo el disponible**, y con montos que no son exactamente
100/300/el total, el usuario no puede expresar lo que quiere (el slider lo
obliga a máximo o mínimo). Además, la vista tiene demasiados estados
seleccionados en verde a la vez (chip de origen, pill "Todo", tarjeta de
destino, banner informativo) y se siente amplia y compleja.

## Objetivos

1. Libertad total de monto: input editable en soles, vacío por defecto.
2. Reducir carga visual: un solo elemento verde "fuerte" (CTA), atajos sin
   estado seleccionado, banner degradado a texto.
3. Eliminar el slider de esta vista.

## No-objetivos

- No se toca el backend (`moveSurplusToSavings`, contexto, schema Convex).
- No se cambia `modules/savings/schemas.ts` (la validación por centavos y
  disponibilidad se mantiene).
- No se borra `shared/components/ui/slider.tsx` (queda sin callers aquí; puede
  servir después).
- No se cambia `move-surplus-view.tsx` salvo que la integración lo exija (no
  debería: los props y `MoveSurplusFormValues` se mantienen).

## Diseño

### 1. Secciones (orden y jerarquía)

1. **Desde** — chips compactos en una línea (`Sobrante de Gustos · S/ 310.00`).
   Seleccionado: verde suave (`border-moss bg-qp-success font-semibold
   text-qp-deep`). No seleccionado: neutro. Deshabilitado (`availableCents <=
   0`): `opacity-40 cursor-not-allowed` (igual que hoy).
2. **Cuánto mover** — input editable grande, protagonista visual:
   - `<input inputMode="decimal">` con `font-serif` grande (reemplaza el span
     display + slider).
   - **Vacío por defecto**, placeholder "¿Cuánto quieres mover?"
     (`text-faint`).
   - A la derecha del input: "de S/ 310.00 disponible" (`text-faint`).
   - Debajo, atajos como **botones de texto discretos**: `+ S/ 100`,
     `+ S/ 300`, `Todo`. Sin estado seleccionado, siempre neutros
     (`border-line bg-card text-ink-secondary`, hover `bg-surface-soft`).
     `+N` suma al valor actual (cap al disponible); `Todo` reemplaza por el
     disponible completo.
3. **Hacia** — tarjetas de destino como hoy; verde solo en la tarjeta
   seleccionada.
4. **Nota de ciclo** — una línea de texto (`text-mute`, sin caja, sin fondo):
   "Solo por este ciclo. Tu distribución 50/30/20 sigue igual el próximo mes."
5. **Acciones** — Cancelar (outline) + CTA "Mover S/ X" (verde sólido: único
   elemento verde fuerte de la página). Disabled si monto ≤ 0, > disponible,
   o sin destino.

### 2. Input editable — comportamiento

- El usuario escribe en soles (`47.5`, `47,50`); conversión a centavos con
  helper `parseAmountToCents` (acepta coma o punto decimal; "" o entrada no
  numérica → `null`).
- Validación con el schema existente (`createMoveSurplusFormSchema`):
  error inline (`text-danger-ink`) si excede el disponible o es ≤ 0 al
  enviar.
- Mientras escribe, no se recorta nada; en **blur** (o al enviar) se marca
  error, no se machaca el valor.
- Al cambiar el origen ("Desde") **no** se resetea el monto: se valida contra
  el nuevo disponible (si excede, error inline, no se sobrescribe).
- `initialAmountCents` (deep-link) sigue prellenando el input si viene (> 0).

### 3. Regla de color (única)

- Verde (`qp-success` / `moss`): solo selección (chips "Desde", tarjetas
  "Hacia") y CTA final.
- Atajos de monto: siempre neutros.
- Banner: sin caja ni fondo; texto `text-mute` de una línea.

### 4. Archivos

| Archivo | Cambio |
|---|---|
| `modules/savings/components/move-surplus-form.tsx` | Reescritura de la sección de monto (input + atajos), banner → texto, quitar Slider |
| `modules/savings/lib/parse-amount-to-cents.ts` (nuevo, o donde vivan los helpers de money) | `parseAmountToCents(raw: string): number \| null` |
| `modules/savings/constants.ts` | Textos: placeholder, `Todo`, nota de ciclo |
| `modules/savings/schemas.ts` | Sin cambios |
| Convex | Sin cambios |

### 5. Testing

- Unit: `parseAmountToCents` — "47.50" → 4750, "47,5" → 4750, "" → null,
  "0" → 0, "abc" → null, decimales > 2 truncados ("47.509" → 4750).
- Smoke manual: deep-link con `initialAmountCents`, cambio de origen con
  monto escrito que excede, CTA disabled states.
