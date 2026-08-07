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
- **Alcance de agentes CI/CD-front:** ajustes de CI/CD, estilos y frontend no
  requieren tocar lógica de Convex; para eso basta `pnpm dev` (+ Convex local si
  se necesita datos). Levantar Convex en la nube está fuera de ese alcance.
- **Backend recomendado: Convex cloud vía `CONVEX_DEPLOY_KEY` (secret).** Con ese
  secret disponible, `npx convex dev --typecheck disable` se conecta al deployment
  dev en la nube (URL `*.convex.cloud`) y **escribe `CONVEX_DEPLOYMENT` +
  `NEXT_PUBLIC_CONVEX_URL` + `NEXT_PUBLIC_CONVEX_SITE_URL` en `.env.local`**. Con
  esta URL la app corre **completa**, incluido el dashboard reactivo (`useQuery`).
  Ese deployment ya trae `BETTER_AUTH_SECRET`, `SITE_URL`, `POLAR_*`, Resend y
  Turnstile en su propio env (`npx convex env list`), así que no hace falta
  volver a setearlos. **Sí** agrega a mano a `.env.local`
  `NEXT_PUBLIC_APP_URL=http://localhost:3000` (lo exige `core/env.client.ts`).
  - **Gotcha:** shells nuevos de `tmux`/login **no** heredan el secret
    `CONVEX_DEPLOY_KEY`; corre `npx convex dev` desde un shell que sí lo tenga en
    el env (o expórtalo antes). Si no, el CLI cae al prompt "login/local".
  - Tras cambiar `.env.local`, **reinicia `pnpm dev`** para que tome la URL nueva.
- **CSP bloquea el backend Convex *local anónimo* en el navegador.**
  `next.config.ts` fija `connect-src` a `*.convex.cloud` / `*.convex.site`
  (https + wss). El backend local anónimo (`CONVEX_AGENT_MODE=anonymous npx convex
  dev`) corre en `ws://127.0.0.1:3210`, que la CSP **no** permite: las queries
  reactivas del cliente (`useQuery`, p. ej. el dashboard) quedan en skeleton para
  siempre. Los flujos **server-side** (sign-up, verificación, sign-in, onboarding
  vía `fetchAuthMutation`) sí funcionan igual porque van por HTTP. Usa el local
  anónimo solo si no tienes `CONVEX_DEPLOY_KEY` y no necesitas el dashboard.
- **Email en dev es no-op**; el enlace de verificación/reset se **loguea en la
  consola de `npx convex dev`** (no se envía, porque `SITE_URL` es localhost).
  Para verificar una cuenta nueva sin correo real, saca la URL del log
  (busca `verify-email`) y ábrela.
- **Turnstile (CAPTCHA) está desactivado en dev** (`isTurnstileEnabled()` es
  `NODE_ENV !== "development"`), así que con `pnpm dev` no bloquea auth aunque el
  deployment tenga llaves de Turnstile.

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
