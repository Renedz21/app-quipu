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

## Única fuente de verdad: `docs/QUIPU-MASTER.md`

**Lee `docs/QUIPU-MASTER.md` antes de cualquier tarea.** Es el documento maestro
del proyecto: producto, diseño (canon v3.0), arquitectura, backend, estándares de
código, flujo de trabajo con IA (skills + gstack), estado actual, roadmap y operación.

Puntos de entrada según la tarea:

| Necesito... | Sección del maestro |
|---|---|
| Contexto del proyecto y reglas | Leer completo una vez |
| Empezar una tarea nueva | §8 Estado y roadmap (qué falta, estados reales) |
| Escribir o revisar código | §4 Arquitectura + §6 Estándares |
| Tocar UI | §3 Diseño (canon, tokens, bloques) |
| Tocar `convex/` | §5 Backend + `convex/_generated/ai/guidelines.md` |
| Saber qué skills usar | §7 Flujo de trabajo con IA |
| Comandos, smoke tests, pre-commit | §9 Operación |

**Reglas que no se repiten aquí a propósito** (viven solo en el maestro):
skills obligatorias (`caveman`/`ponytail` siempre activos), gstack, estructura de
carpetas, decisiones técnicas, convenciones y pendientes.

Si algo contradice al maestro, gana el maestro (o se actualiza explícitamente allí).
