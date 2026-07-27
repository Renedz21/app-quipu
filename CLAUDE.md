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

---

## Cursor Cloud specific instructions

Notas no obvias para agentes en la VM de Cursor Cloud. Comandos estándar
(dev, lint, test, build) viven en `README.md` y `docs/QUIPU-MASTER.md` §9.

- **Environment config:** `.cursor/environment.json` (repo) define el `install`
  script. Tiene prioridad sobre el environment personal del dashboard. Tras
  cambiar skills o deps, merge a `master` y arranca un **agente nuevo** (o
  Dashboard → environment → *New Setup Run* / *Update with Agent* para
  refrescar el snapshot).
- **Instalar deps + skills:** `bash scripts/cloud-agent-update.sh` (lo corre el
  boot del Cloud Agent). Restaura desde `skills-lock.json` y actualiza packs
  críticos (`caveman`, `ponytail`, `superpowers`, Convex, Vercel, Better Auth,
  Next.js). En local: `npx skills update -y -p`.
- **Instalar deps:** `pnpm install` (Node 22 + pnpm 10 vía Corepack ya presentes).
  El script de arranque del entorno ya lo corre.
- **`.env.local` no existe en el repo y no hay `.env.example`.** El front no
  arranca sin él porque `core/env*.ts` valida env en build. Para dev local:
  `CONVEX_AGENT_MODE=anonymous npx convex dev` crea un backend Convex **local
  anónimo** (sin cuenta) y escribe `CONVEX_DEPLOYMENT` + `NEXT_PUBLIC_CONVEX_URL`
  + `NEXT_PUBLIC_CONVEX_SITE_URL` en `.env.local`. Faltan y hay que agregar a mano:
  `BETTER_AUTH_SECRET` (≥32 chars), `SITE_URL`, `NEXT_PUBLIC_APP_URL`,
  `POLAR_PRODUCT_ID_PREMIUM` (placeholder), `POLAR_SERVER=sandbox`. Además el
  backend Convex lee `BETTER_AUTH_SECRET` y `SITE_URL` de su propio env:
  `npx convex env set BETTER_AUTH_SECRET <...>` / `... SITE_URL http://localhost:3000`.
- **Convex typecheck falla con `Cannot find name 'process'`** al hacer `convex dev`:
  el runtime de Convex sí expone `process.env`, pero `convex/tsconfig.json` no
  incluye tipos de Node. Para pushear funciones al backend local usa
  `npx convex dev --typecheck disable`. No es un error de código.
- **Deployment local anónimo se llama `anonymous:...`**, no `dev:...`. Por eso
  `convex/testing.ts:setMyPlan` (guard `CONVEX_DEPLOYMENT` empieza con `dev:`) no
  corre en local; el smoke de rescate premium no se puede ejercitar contra el
  backend local anónimo.
- **E2E smoke (`pnpm test:e2e:smoke`) hoy falla contra un deployment nuevo** por
  auth, no por infra de tests: el sign-up usa `autoSignIn:false` +
  `requireEmailVerification:true`, así que `/api/auth/convex/token` responde 401
  (no hay sesión). Es un tema de auth/sesión (lado Convex), independiente de la
  paralelización. Playwright no levanta el dev server en local (solo en CI):
  hay que tener `pnpm dev` corriendo aparte.
- **Alcance de agentes CI/CD-front:** ajustes de CI/CD, estilos y frontend no
  requieren tocar lógica de Convex; para eso basta `pnpm dev` (+ Convex local si
  se necesita datos). Levantar Convex en la nube está fuera de ese alcance.
