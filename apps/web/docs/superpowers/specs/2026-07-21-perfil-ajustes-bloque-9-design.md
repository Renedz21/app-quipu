# Perfil y ajustes — Bloque 9 backend (2026-07-21)

> Convex-only: agregación de cuenta + sistema para la pantalla "¿Cómo funciona mi sistema?"
> Sin UI en esta entrega. Sin Polar ni revoke-all de sesiones.

## Alcance backend

| API | Rol |
|---|---|
| `settings.getSettingsOverview` | Perfil, plan stub, ciclo activo, reparto, compromisos + total, preferencias, passkeys |
| `settings.listMyPasskeys` | Lista passkeys del usuario (Better Auth component) |
| `settings.updateAllocations` | Necesidades / Gustos / Ahorro (100% entero, `isValidAllocations`) |
| `settings.updatePreferences` | `dailySummaryEnabled`, `cycleAlertsEnabled` |
| `profiles.updateProfileSettings` | Sin cambio — payFrequency/paydays (flujo "Cambiar ciclo" diferido) |

## Schema

- `profiles.dailySummaryEnabled`, `profiles.cycleAlertsEnabled` — opcionales; lectura con default `true` en `settingsCopy`.

## Passkeys

- Lectura vía `ctx.runQuery(components.betterAuth.adapter.findMany, { model: "passkey", where userId })`.
- Solo metadatos seguros: nombre, tipo de dispositivo, fecha, respaldo.
- Si el componente no responde: array vacío + `passkeysSource: "unavailable"` (no inventar registros).

## Copy puro

- `convex/lib/settingsCopy.ts` + Vitest: etiquetas de perfil/ciclo/plan alineadas al onboarding.

## Diferido (UI u otras capas)

- Polar (renovación, checkout, webhooks).
- Cerrar todas las sesiones / listado de sesiones activas.
- Editar nombre de perfil y avatar.
- Flujo "Cambiar ciclo" (mutación dedicada + UI).
- Enlace perfil → `/progress` (gamificación).

## Criterios de cierre

1. `getSettingsOverview` autenticado devuelve view model completo; sin sesión → `null`.
2. Mutaciones con auth + validación ConvexError.
3. `pnpm test`, `pnpm typecheck`, `npx convex codegen` verdes.
