# Bloque 9 — Perfil y ajustes (implementación 2026-07-21)

Plan ejecutable para **Ajustes · cuenta + sistema** (canon `quipu-2.html` Bloque 9).

## Alcance de esta iteración

### Hecho

- **Rutas:** `/settings`, `/settings/allocations`, `/settings/cycle` (stub honesto).
- **Cuenta (paralelo):** `settings-view`, tarjetas perfil/plan/seguridad, passkeys vía Better Auth, cerrar sesión, enlace `/progress`.
- **Sistema:** `settings-system-section` (barra 50/30/20, ciclo read-only, preferencias moneda/idioma read-only, toggles → `api.settings.updateNotificationPreferences`).
- **Compromisos:** `settings-commitments-section` + diálogo `createFixedCommitment`.
- **Nav:** `SIDEBAR_ITEMS` / `BOTTOM_NAV_ITEMS` → `/settings`; icono Ajustes; active en subrutas.
- **Backend:** `convex/settings.ts` (`updateAllocations`, `updateNotificationPreferences`); campos `dailySummaryEnabled` / `cycleAlertsEnabled` en `profiles`.
- **E2E smoke:** heading «Ajustes» en `/settings`.
- **Maestro:** §3.7 fila 9, §8 P1-12, §5.2, changelog.

### Diferido

- Polar.sh (facturación, renovación real, cambiar tarjeta).
- Cerrar todas las sesiones (API Better Auth).
- Editar nombre de perfil.
- Wizard completo «Cambiar ciclo».
- Ruta nav dedicada solo compromisos.
- `getSettingsOverview` en `convex/settings.ts`; UI en `settings-view` vía `mapConvexSettingsOverview`.

## Archivos clave

| Área | Path |
|---|---|
| Vista | `modules/settings/components/settings-view.tsx` |
| Sistema | `modules/settings/components/settings-system-section.tsx` |
| Compromisos | `modules/settings/components/settings-commitments-section.tsx` |
| Reparto móvil | `modules/settings/components/settings-allocations-editor.tsx` |
| Convex | `convex/settings.ts` |
| App routes | `app/(app)/settings/**` |

## Verificación

```bash
pnpm typecheck
pnpm test
pnpm test:e2e:smoke
```

## Conflictos con agentes paralelos

- **`modules/settings/constants.ts`:** fusionar constantes cuenta + sistema (no duplicar claves).
- **`settings-view.tsx`:** cuenta arriba; columna sistema + compromisos debajo (reemplaza slot `SETTINGS_SYSTEM_SLOT_NOTE`).
- **`convex/settings.ts`:** `getSettingsOverview`, `listMyPasskeys`, mutaciones reparto/preferencias.
