# AGENTS.md — Contexto para agentes de IA

> Este archivo es leído por herramientas como Zed, Claude Code, Cursor, etc.
> Su gemelo `CLAUDE.md` se mantiene idéntico por compatibilidad.
> El bloque entre `convex-ai-start` / `convex-ai-end` es administrado por
> `npx convex ai-files install` y **no debe modificarse manualmente**.

---

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

---

## Proyecto: Quipu v2

App web de finanzas personales proactivas para el mercado peruano.
Inspirado en los quipus incas — la app divide el sueldo **antes** de gastarlo,
no después.

- **Tagline:** "Tu sueldo, con disciplina."
- **Stack:** Next.js 16.2 (App Router) · React 19.2 · Convex 1.42 · Better Auth + passkey · TanStack Form + Zod · shadcn/ui sobre Base UI · Tailwind v4 · Biome 2.5
- **Versión actual:** 0.0.2 (v2 inicio). La v1 fue experimento; esta es la real.
- **Documentación canónica:**
  - `docs/quipu.md` — el producto.
  - `docs/arquitectura.md` — **lee esto antes de tocar código.** Constitución de v2.
  - `docs/nextjs_knowledge.md` — modelo mental de Next.js 16 (referencia).
  - `docs/demo-architecture.md` — filosofía Feature First adaptada (referencia).

---

## Reglas no negociables

1. **Lee `docs/arquitectura.md` antes de cualquier cambio significativo.** Ahí están las decisiones explícitas (no `cacheComponents`, skeletons por sección, regla de 2 niveles, etc.) y los anti-patrones que v1 cometió.
2. **Toda la lógica vive en Convex.** El cliente es presentación + orquestación. Si una regla de negocio puede ir en una `mutation` o `query`, va ahí.
3. **Server Component por defecto.** `'use client'` solo cuando hay estado, eventos, o `useQuery` de Convex. Empuja el boundary lo más abajo posible.
4. **Errores tipados, no strings.** Lanza `ConvexError({ code, message })` desde el backend con códigos válidos del enum en `core/errors/index.ts`. En el cliente usa `fromConvexError()` y discrimina por `error.code`. Nunca compares `error.message` con strings.
5. **Dinero en céntimos enteros, siempre.** Usa `shared/lib/money.ts` para formatear/parsear. Nunca hagas `amount * 100` a mano en un componente.
6. **Fechas en timezone `America/Lima`.** Usa `shared/lib/date.ts`. No construyas timestamps con `new Date()` directo para fechas del usuario.

---

## Estructura de carpetas (resumen)

| Carpeta | Qué vive ahí | Regla clave |
|---|---|---|
| `app/` | Routing, layouts, pages, route handlers | Sin lógica de negocio. Composición pura. |
| `auth/` | Better Auth: client, server, passkey | Configuración central, no lógica de dominio. |
| `convex/` | Schema, queries, mutations, lógica de negocio | Aquí vive la verdad. `convex/_generated/` no se edita. |
| `core/` | `env.ts`, `errors/`, `constants.ts` | Sin UI, sin dominio. Infra transversal. |
| `shared/` | UI primitives (shadcn), helpers (`money`, `date`, `forms/`), layout reusable | Sin lógica de un módulo específico. |
| `modules/[x]/` | Un directorio por dominio (`payday`, `expenses`, `dashboard`, etc.) | **Máx. 2 niveles bajo `[x]/`.** No más. |
| `hooks/` | Hooks globales cross-module | Solo lo que usan 2+ módulos. |
| `docs/` | Documentación canónica | Fuente de verdad para decisiones. |

**Estructura interna de un módulo** (todos siguen la misma):
```
modules/[x]/
├── components/    Componentes React del dominio
├── actions.ts     Wrappers tipados sobre mutations Convex
├── queries.ts     Wrappers tipados sobre queries Convex
├── schemas.ts     Zod schemas para inputs y payloads
├── types.ts       View models y DTOs del cliente
└── constants.ts   Constantes del módulo
```

**Regla de oro del 2-niveles:**
- ✅ `modules/payday/components/payday-form.tsx`
- ❌ `modules/payday/components/forms/payday-form.tsx`
- ❌ `modules/payday/components/payday-form/amount-field.tsx`

Si necesitas un tercer nivel, el archivo o es reusable (→ `shared/`) o se parte o es de otro dominio (→ su módulo).

---

## Flujo de dependencias (unidireccional)

```
app/     →  modules/  →  shared/  →  core/
app/     →  modules/  →  convex/_generated/  (tipos solamente)
app/     →  auth/
convex/ →  core/
shared/ →  core/
```

**Nunca:**
- `core/` no importa de `modules/` ni `shared/`.
- `shared/` no importa de `modules/`.
- `modules/[x]/` no importa de `modules/[y]/` directamente. Si comparten lógica, sube a `shared/` o `core/`.

---

## Decisiones técnicas explícitas (no revertir sin discutir)

| Decisión | Estado | Razón |
|---|---|---|
| `cacheComponents: true` | **NO activado** | v1 lo quemó. Se activa cuando haya 3+ fetches cacheables entre usuarios. |
| `reactCompiler: true` | Activado | Cubre `memo`/`useMemo`/`useCallback` manuales. Confiar en él. |
| `loading.tsx` global | **No usar** | Bloquea LCP. Usar `<Suspense>` con skeletons por sección. |
| Server Actions | Solo cuando Convex no resuelva | Default: mutation Convex desde cliente vía `actions.ts`. |
| Multi-moneda | **No** por ahora | PEN hardcoded en `core/constants.ts`. |
| React Compiler manual memo | Evitar | Solo si el profiler lo justifica. |
| Tipos duplicados a mano | Prohibido | Derivar de `convex/_generated/dataModel` con `Pick`/`Omit`. |

---

## Comandos útiles

```bash
# Desarrollo
pnpm dev                    # Next dev server
npx convex dev              # Convex backend en dev (en otra terminal)

# Validación
pnpm tsc --noEmit           # Typecheck
pnpm lint                   # Biome lint
pnpm format                 # Biome format

# Convex
npx convex dashboard        # UI de Convex
npx convex deploy --prod    # Deploy a producción
npx convex ai-files install # Refrescar bloque managed de AGENTS.md
```

---

## Patrones de código (ejemplos canónicos)

### Crear un módulo nuevo

```
modules/[nombre]/
├── components/[nombre]-view.tsx
├── actions.ts              # wrappers sobre mutations
├── queries.ts              # wrappers sobre queries
├── schemas.ts              # Zod
├── types.ts                # view models
└── constants.ts            # labels, defaults del módulo
```

### Wrapper de mutation Convex (Server Action)

```ts
// modules/[x]/actions.ts
"use server";
import { fetchAuthMutation } from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { fromConvexError, AppError } from "@/core/errors";
import { myActionSchema } from "./schemas";

export async function myAction(input: unknown) {
  const parsed = myActionSchema.parse(input);
  try {
    return await fetchAuthMutation(api.[module].myMutation, parsed);
  } catch (error) {
    throw fromConvexError(error);
  }
}
```

### Backend lanza error tipado

```ts
// convex/[module].ts
import { ConvexError } from "convex/values";

throw new ConvexError({
  code: "NO_ACTIVE_CYCLE",
  message: "No hay un ciclo activo para esta operación",
});
```

### Componente con Suspense y skeleton

```tsx
// app/(app)/dashboard/page.tsx (Server Component)
import { Suspense } from "react";

export default async function DashboardPage() {
  return (
    <AppShell header={<DashboardHeader />}>
      <Suspense fallback={<EnvelopesSectionSkeleton />}>
        <EnvelopesSection />
      </Suspense>
      <Suspense fallback={<StreakSectionSkeleton />}>
        <StreakSection />
      </Suspense>
    </AppShell>
  );
}
```

---

## Gotchas y trampas comunes

- **`convex/_generated/` está auto-generado.** No editar a mano. Se regenera con `npx convex dev` o `npx convex deploy`.
- **`useQuery` solo funciona en Client Components.** Si necesitas datos de Convex en un Server Component, usa `preloadAuthQuery` / `fetchAuthQuery` de `@/auth/auth-server`.
- **`fetchAuthMutation` tira excepción en error**, no retorna un `result.ok`. Envuelve en `try/catch` y usa `fromConvexError()`.
- **`process.env.NEXT_PUBLIC_*` está disponible en cliente**; el resto solo en servidor. Para acceso validado usa `@/core/env`.
- **El `passkeyClient()` y `convexClient()` en `auth-client.ts`** son obligatorios; sin ellos Better Auth no conecta con Convex.
- **Turbopack es el default en Next 16.** No requiere config, pero si ves un bug raro probá `next dev --turbopack=false` para descartar.
- **React Compiler activado = no uses `memo`/`useCallback` "por las dudas".** Confiá en él hasta que el profiler diga lo contrario.

---

## Convenciones de código

- **Naming:**
  - Componentes: `PascalCase` (`EnvelopeCard.tsx`).
  - Hooks: `camelCase` con prefijo `use` (`useConvexQuery.ts`).
  - Tipos: `PascalCase`, sin prefijo `I` (`Profile`, no `IProfile`).
  - Constantes: `UPPER_SNAKE_CASE` para verdaderos constantes globales; `camelCase` para configs de módulo.
- **Imports:** usar alias `@/` (configurado en `tsconfig.json`). No imports relativos de más de 2 niveles (`../../../`).
- **Comentarios:** explicar el **por qué**, no el **qué**. El código se lee solo; la intención no.
- **TODOs:** marcar con `// TODO(nombre):` para poder grepearlos. `// TODO(cacheComponents):` está reservado para candidatos a `use cache`.
- **Español en UI y mensajes de error**, inglés en código (variables, funciones, tipos). Mensajes al usuario siempre en español peruano.
- **Biome** formatea y lintea. No discutir comillas/punto y coma con él.

---

## Reglas de código limpio

### Un archivo = una responsabilidad

No mezclar UI, lógica de negocio, y datos en el mismo archivo:
- Componentes React renderizan JSX.
- Funciones puras computan (van en `lib/` del módulo).
- Hooks orquestan estado/efectos (van en `hooks/` del módulo).
- Server actions mutan datos (van en `actions.ts`).

### Cero GOD COMPONENTS / GOD FILES

- Si un archivo pasa ~200 líneas o tiene 3+ componentes exportables, dividilo.
- Cada componente en su propio archivo.
- Anti-patrón: archivo de 300+ líneas con 3 componentes inline y lógica de negocio mezclada.

### TanStack Form para forms complejos

Usar TanStack Form + Zod resolver cuando:
- ✅ El form tiene **3+ campos** con **validación cruzada** entre ellos.
- ✅ El estado del form es complejo (arrays dinámicos, dependencias entre campos).

No usar TanStack Form cuando:
- ❌ El form tiene 1-2 campos con validación independiente (basta useState + Zod safeParse inline).
- ❌ Solo hay un botón de submit sin inputs.

### Lógica de negocio fuera del componente

- Extraer funciones puras a `modules/[x]/lib/`.
- Extraer hooks de orquestación a `modules/[x]/hooks/`.
- El componente solo llama a la función/hook, no contiene el algoritmo.

Ejemplo correcto:
```ts
// modules/allocations/lib/compute-allocation.ts — función pura
export function computeAllocation(key, newValue, current) { ... }

// modules/allocations/components/step-5-allocations.tsx — solo UI
const handleChange = (key, val) => {
  const rounded = computeAllocation(key, val, state);
  update(rounded);
};
```

### KISS + DRY

- Preferir la solución más simple que funciona.
- No anticipar necesidades futuras (YAGNI).
- Si dos componentes comparten lógica, extraerla; si no comparten, no.

---

## Antes de abrir un PR / commit

1. `pnpm tsc --noEmit` — sin errores.
2. `pnpm lint` — sin warnings nuevos.
3. Si tocaste `convex/schema.ts`, regenerar tipos con `npx convex dev` y commitear `convex/_generated/`.
4. Si agregaste una env var, agregarla a `core/env.ts` con validación Zod.
5. Si agregaste un error nuevo, agregarlo al enum `ErrorCode` en `core/errors/index.ts`.
6. Mensaje de commit: ver convención en `AGENTS.md` personal (imperativo, <50 chars en subject, sin punto final).

---

## Manuales de sistema

Antes de tomar decisiones de arquitectura, auditar un plan, depurar bugs no triviales, refactorizar código maduro o preparar un despliegue, consultá el manual correspondiente. Cada uno define un modo de operación distinto — no los mezcles en la misma sesión.

📘 **`docs/manuales-de-sistema.md`** contiene 6 system prompts canónicos:

| Manual | Cuándo leerlo |
|---|---|
| 1. Chequeo de Seguridad (Arranque) | Arranque de un proyecto o nueva superficie (auth, pagos, jobs). |
| 2. Fable Plan (El Interrogador) | Antes de diseñar una feature o aceptar un reporte de bug. |
| 3. Abogado del Diablo | Revisión adversarial de un plan, diseño o PR. |
| 4. El Fixer (RCA) | Bug no trivial, intermitente, o "ya estaba así". |
| 5. El Optimizador de Rendimiento y Refactor | Llevar código que "ya funciona" a estándar de producción. |
| 6. Guardián de CI/CD y Despliegue | Antes de cualquier release o cambio de pipeline. |

**Regla:** si un manual aplica a tu tarea, usalo. No improvises el rigor — copialo.

---

## Skills obligatorias (comunicación + estilo de código)

**Modo por defecto de TODA respuesta de IA en este proyecto:**

- **`caveman` (full):** respuestas cortas, sin filler, sin hedging, sin tablas decorativas, sin narrar tool calls. Tokens importan.
- **`ponytail` (full):** soluciones más cortas que funcionan. Cuestionar si la tarea necesita existir. Reusar antes que re-implementar. Diff mínimo.
- **Persistencia:** activos en cada respuesta. No se desactivan solos. Solo `"stop caveman"` o `"stop ponytail"` los apaga.

**Skills de proceso (cargar cuando aplique):**

| Skill | Cuándo |
|---|---|
| `using-superpowers` | **Siempre al inicio de cada conversación.** Establece cómo encontrar y usar el resto de skills. |
| `brainstorming` | Antes de feature nueva, refactor mayor, o diseño. |
| `verification-before-completion` | Antes de afirmar que algo funciona / pasa / está listo. |
| `test-driven-development` | Implementar features o fix bugs (TDD donde aplique). |
| `systematic-debugging` | Bug, test failure, comportamiento inesperado. |
| `writing-plans` | Spec o requirements para tarea multi-step, antes de tocar código. |
| `writing-skills` | Crear o editar skills. |
| `requesting-code-review` | Al cerrar trabajo significativo. |
| `receiving-code-review` | Al recibir feedback de review, antes de implementar. |
| `cavecrew` | Delegar a subagentes cuando hay 2+ tareas independientes. |

**Regla:** si una skill matchea la tarea, **cargala con la tool `skill` antes de actuar**. No improvises el rigor.

---

## gstack

[gstack](https://github.com/garrytan/gstack) está instalado globalmente (`~/gstack`).

**Web browsing:** usa la skill `/browse` de gstack para **todo** navegación web. **Nunca** uses herramientas `mcp__claude-in-chrome__*` ni ningún otro MCP/browser tool.

**Skills disponibles:**

- `/office-hours` — explorar ideas y problemas antes de construir
- `/plan-ceo-review` — revisión de plan desde perspectiva CEO
- `/plan-eng-review` — revisión de plan desde perspectiva ingeniería
- `/plan-design-review` — revisión de plan desde perspectiva diseño
- `/design-consultation` — consulta de diseño
- `/design-shotgun` — múltiples variantes de diseño en paralelo
- `/design-html` — prototipo HTML de diseño
- `/review` — code review estructurado
- `/ship` — preparar y abrir PR
- `/land-and-deploy` — merge y deploy
- `/canary` — verificación post-deploy
- `/benchmark` — benchmark de rendimiento
- `/browse` — navegación web headless (usar para **todo** browsing)
- `/connect-chrome` — conectar browser Chrome existente
- `/qa` — QA visual y funcional
- `/qa-only` — QA sin fixes
- `/design-review` — revisión de diseño UI/UX
- `/setup-browser-cookies` — configurar cookies de browser
- `/setup-deploy` — configurar pipeline de deploy
- `/setup-gbrain` — configurar GBrain (memoria persistente)
- `/retro` — retrospectiva de sesión
- `/investigate` — investigar codebase o bug
- `/document-release` — documentar release
- `/document-generate` — generar documentación
- `/codex` — delegar a Codex CLI
- `/cso` — Chief Strategy Officer review
- `/autoplan` — planificación autónoma multi-step
- `/plan-devex-review` — revisión de plan DevEx
- `/devex-review` — revisión DevEx
- `/careful` — modo cauteloso (menos cambios)
- `/freeze` — congelar archivos contra edits
- `/guard` — proteger archivos críticos
- `/unfreeze` — descongelar archivos
- `/gstack-upgrade` — actualizar gstack
- `/learn` — capturar aprendizajes de sesión

---

## Reglas de auth (v2.5)

- **Auth es un módulo de dominio** (`modules/auth/`), no vive dentro de `app/(auth)/`. El route group `(auth)` es solo wiring de Next.js. Los componentes del dominio auth están en `modules/auth/components/`.
- **Las páginas de auth no usan tabs.** La ruta refleja intención (`sign-in` vs `sign-up`) y método (`passkey` vs `email`). URLs: `/sign-in`, `/sign-up`, `/sign-in/email`, `/sign-up/email`.
- **Validaciones de sesión van en `page.tsx`, no en `layout.tsx`.** Usar `requireUnauthenticatedSession()` (rutas auth) o `requireAuthenticatedSession()` (rutas protegidas) desde `auth/auth-server.ts`.
- **Componentes reusables de status** viven en `shared/components/auth/` (`status-card`, `status-icon`), no en `modules/auth/`. El módulo auth los consume.
- **Errores de Better Auth** se traducen a `ErrorCode` vía `modules/auth/errorMap.ts`. Nunca comparar `error.message` con strings en la UI.

---

## Trabajo pendiente

**Mapa vivo de lo que falta para cerrar la migración v2.0 → v2.5 y los follow-ups que dejó.** Antes de empezar cualquier tarea nueva, leé:

📋 **`docs/superpowers/plans/2026-07-08-v25-pending-work.md`**

Ahí vas a encontrar items en P0 (blockers del merge a main), P1 (próximo a hacer) y P2 (backlog), cada uno escrito como mini-plan ejecutable (interfaces, archivos, código, tests, commit). Si encontrás trabajo pendiente nuevo durante tu tarea, **agregalo a ese documento en la prioridad que corresponda** siguiendo el template del final. No asumas que algo no es problema sin haber revisado este documento primero.

**Regla:** si un agente detecta un gap que se resolverá más adelante, debe actualizar este documento (no un TODO en el código). El documento es la fuente de verdad compartida.

---

## Referencias rápidas

| Necesito saber sobre... | Ir a |
|---|---|
| El producto | `docs/quipu.md` |
| Arquitectura y convenciones | `docs/arquitectura.md` ← **el más importante** |
| Next.js 16, PPR, `use cache` | `docs/nextjs_knowledge.md` |
| Feature First y Drizzle (referencia) | `docs/demo-architecture.md` |
| Variables de entorno | `core/env.ts` |
| Errores tipados | `core/errors/index.ts` |
| Formateo de dinero | `shared/lib/money.ts` |
| Fechas Lima | `shared/lib/date.ts` |
| Inputs de forms | `shared/forms/` |
| Layout reusable | `shared/components/layout/` |
| Convex backend | `convex/` |
| **Trabajo pendiente / follow-ups v2.5** | `docs/superpowers/plans/2026-07-08-v25-pending-work.md` ← **revisar antes de empezar tareas nuevas** |
| **Manuales de sistema (arquitectura, Fable Plan, RCA, refactor, CI/CD)** | `docs/manuales-de-sistema.md` ← **consultar el manual adecuado antes de actuar** |
