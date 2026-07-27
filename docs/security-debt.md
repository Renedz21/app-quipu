# Deuda de seguridad — Quipu

> Registro de riesgos conocidos y diferidos deliberadamente. Cada entrada tiene
> motivo del diferimiento y plan de resolución. Origen: auditoría de seguridad
> del 2026-07-22 (fixes aplicados el mismo día; esto es lo que quedó fuera).

---

## D1 — Verificación de email y recuperación de cuenta

**Severidad original:** Alta · **Estado:** ✅ **Resuelto en código (2026-07-22)** — falta
configurar `RESEND_API_KEY` + `RESEND_FROM` en prod (owner).

**Implementado:**

- `convex/auth.ts`: `requireEmailVerification: true`, `sendVerificationEmail` y
  `sendResetPassword` vía `convex/lib/email/` (Resend SDK en `send.ts`).
- Flujos UI: `/recuperar`, `/restablecer-contrasena`, enlace «Olvidé mi contraseña»,
  post-registro «Revisa tu correo», banners en sign-in (no verificado / reset ok).
- `autoSignIn: false` tras sign-up con email/contraseña hasta verificar.

**Pendiente owner (prod):** variables Resend en Convex + dominio verificado en Resend.

---

## D2 — Rate limiting en memoria (storage distribuido no disponible)

**Severidad original:** Media · **Estado:** ✅ **Mitigado con rate-limiter Convex (2026-07-27)**

**El problema.** `rateLimit.storage: "memory"` en Better Auth guarda contadores por aislado serverless.

**Lo aplicado (2026-07-27).**

- Componente `@convex-dev/rate-limiter` montado en `convex/convex.config.ts`.
- `convex/lib/authRateLimit.ts` — límites distribuidos en hooks de verificación, reset y sign-up.
- Better Auth `rateLimit.enabled: true` + reglas custom en paths auth (defensa adicional en memoria).
- Cooldown email vía `emailSendLog` (3 min).

**Pendiente (opcional).** Migrar Better Auth a `storage: "database"` cuando `@convex-dev/better-auth` implemente `incrementOne`.

---

## D3 — Datos financieros huérfanos al eliminar usuario

**Severidad original:** Media · **Estado:** ✅ **Resuelto (2026-07-22)**

**Implementado:**

- Better Auth `deleteUser.enabled` + UI «Eliminar cuenta» en Ajustes
  (`modules/settings/components/settings-delete-account-item.tsx`).
- Trigger `onDelete` en `convex/auth.ts` → `internal.profiles.deleteAllDataForProfile`
  (cascada por `profileId` en todas las tablas del dominio).
- Exportación JSON portabilidad: `profiles.exportMyData` + botón en Ajustes
  (Ley 29733).

---

## D4 — Rotación de `BETTER_AUTH_SECRET` de producción (acción manual del owner)

**Severidad original:** Alta · **Estado:** pendiente — **requiere acción humana**

El secreto que firma sesiones de producción era idéntico al de desarrollo y
vive en archivos `.env` locales (fuera de git, pero en disco).

**Acciones (solo las puede hacer el dueño del proyecto):**

1. Generar un secreto nuevo e independiente para producción
   (`openssl rand -base64 32`).
2. Configurarlo en el dashboard de Convex del deployment de producción (y en el
   hosting de Next si aplica). Nunca en archivos locales.
3. Rotar el anterior: las sesiones activas se invalidan (los usuarios vuelven a
   entrar con passkey — coste aceptable).
4. Repetir la separación para cualquier otro secreto compartido dev/prod.

**Estado al cierre Fase 0 (2026-07-22):** ⬜ **Sigue pendiente** hasta que el owner confirme los cuatro pasos
en el deployment de producción. No marcar ✅ por automatización del agente.

---

## Release checklist P2-8 (owner — Polar prod + secretos)

Usar junto con §9.4–§9.5 de `docs/QUIPU-MASTER.md`. El agente documenta; **no** despliega Vercel ni
rota secretos.

| Paso | Acción | Estado |
|---|---|---|
| R1 | Vercel: proyecto, env prod, `pnpm build` smoke | ⬜ Owner |
| R2 | Convex prod: `npx convex deploy --prod`; commitear `_generated/` si cambió schema | ⬜ Owner |
| R3 | Polar prod: env en Convex + webhook + `billing:syncProducts` | ⬜ Owner |
| R4 | Smoke checkout → `profiles.plan` = `premium` + rescate coach premium | ⬜ Owner |
| R5 | **D4:** nuevo `BETTER_AUTH_SECRET` solo prod; invalidar sesiones antiguas | ⬜ Owner |
| R6 | **D1 prod:** `RESEND_API_KEY` + `RESEND_FROM` en Convex | ⬜ Owner |

---

## Historial de la auditoría 2026-07-22

Fixes aplicados el mismo día (fuera de este registro de deuda):

- **C1** `resetDb.resetAll` → `internalAction` (era un wipe público de toda la BD).
- **C2** Passkey `resolveUser` rechaza emails ya registrados (era account
  takeover anónimo con solo conocer el email).
- **A2** `createProfile` ya no acepta `plan` del cliente (era auto-premium gratis).
- **A3** Headers de seguridad en `next.config.ts` (CSP, frame-ancestors, nosniff,
  Referrer-Policy, Permissions-Policy con WebAuthn, HSTS).
- **M1** Rate limit explícito + regla estricta `/passkey/*` (ver D2).
- **M2** `data-ph-mask` en el shell del área privada (el session recording de
  PostHog enmascara todo el texto: saldos, gastos).
- **M3** `toAppError` ya no filtra `error.message` interno a la UI.

**Fase 0 SaaS (2026-07-22):** D1 y D3 cerrados en código; legal `/terminos` + `/privacidad`;
CI lint + typecheck + Vitest; Sentry + PostHog; `requirePremiumProfile` + paywall UI;
auth recovery/verification UI.
