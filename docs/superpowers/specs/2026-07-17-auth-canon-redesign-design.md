# Auth canon redesign — Spec (2026-07-17)

> Reskin del Bloque 1 (Autenticación) al canon visual de `quipu-2.html` / `docs/quipu-design.md` §5.1.
> **No cambia la lógica funcional**: passkeys y email funcionan como hoy. Solo se reordena en rutas
> con intención y se aplica el sistema visual canon (tipografías, tokens, componentes, microcopy).

## Decisiones (aprobadas por el usuario)

1. **HTML = referencia visual solamente.** Marcos de navegador ficticio, URLs inventadas y shell decorativo se ignoran.
2. **Rutas en inglés**: `/sign-in`, `/sign-up`. `/auth` redirige a `/sign-in`.
3. **Funcionalidad intacta**: `signUp.email` con password interna random, `signIn.passkey` discoverable + conditional UI, `signIn.email` para cuentas existentes. Sin backend nuevo.
4. **Alcance**: core (`/sign-in`, `/sign-up`) + estados (error terracota, loading en botones, éxito). Sin landing, sin recuperación de contraseña.
5. **Panel lateral de sign-in sin cifra ficticia.** El usuario no autenticado no tiene "Disponible hoy" real; mostrar `S/ 82.50` sería mentir. El panel lleva saludo + tríada (Tranquilidad · Control · Buen camino).
6. **Contraseña de respaldo**: se mantiene el status quo (password interna random que el usuario no conoce). Gap registrado en pending-work.

## Rutas y flujo

```
/sign-in   server component · requireUnauthenticatedSession() · ?email&reason
/sign-up   server component · requireUnauthenticatedSession() · ?email
/auth      redirect("/sign-in")
```

### Sign-in
1. Split canon (panel lateral 400px solo `lg:`). Email + "Continuar" + "Entrar con passkey" (discoverable). Conditional UI autofill en el input email (`username webauthn`).
2. Continuar → step inline contraseña → `signIn.email`. Error → banner terracota "No pudimos iniciar sesión".
3. Passkey → `/dashboard` (`router.push` + `refresh`).
4. `?reason=exists` → banner info "Ya tienes cuenta. Entra con tu passkey o contraseña."
5. Link "Crear cuenta" → `/sign-up`.

### Sign-up
Steps inline en una ruta (la sesión ya existe tras crear cuenta):
1. **Form**: nombre + correo (`signUpSchema`), "Crear cuenta", microcopy términos.
   `USER_ALREADY_EXISTS` → `redirect("/sign-in?email=x&reason=exists")`.
2. **Passkey**: escudo canon, "Entra sin contraseñas", "Crear passkey" + "Ahora no".
3. **Éxito**: check canon, "Tu cuenta está lista", CTA "Ir al onboarding →" → `/configurar`.

Sign-up ahora captura **nombre real** (hoy deriva de `email.split("@")[0]`).

## Archivos

**Nuevos:**
- `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`
- `modules/auth/components/sign-in-view.tsx` (client)
- `modules/auth/components/sign-up-view.tsx` (client, 3 steps)
- `modules/auth/components/auth-side-panel.tsx` (server-safe)
- `modules/auth/components/passkey-setup.tsx` (client)
- `modules/auth/components/auth-error-banner.tsx` (presentational)
- `modules/auth/schemas.ts`
- `shared/components/quipu-logo.tsx` (server-safe, reusable en dashboard)

**Borrados:** `start-form.tsx`, `existing-account-panel.tsx`, `sign-in-form.tsx`, `sign-up-form.tsx`, `add-passkey-button.tsx`, `passkey-reminder-banner.tsx` (sin uso).

**Modificados:**
- `app/layout.tsx` — Newsreader (`--font-serif`) + Hanken Grotesk (`--font-sans`, reemplaza Inter) + Geist Mono. Metadata Quipu.
- `app/globals.css` — tokens canon: neutros (canvas/ink/mute/faint/line), acento (qp*), terracota (danger*), `qspin`/`qpulse`, `shadow-glow`.
- `shared/components/ui/button.tsx` — variant default → canon primary (bg ink), outline → canon secondary.
- `shared/components/ui/input.tsx` — geometría canon (h-12, rounded 11, bg surface-soft, focus ring qp05).
- `app/(auth)/layout.tsx` — bg canvas, sin placeholder.svg.
- `app/(auth)/auth/page.tsx` — redirect.

**Intactos:** `auth/auth-client.ts`, `auth/auth-server.ts`, `use-passkey-support.ts`, toda `convex/`.

## Estados (canon §4)

- **Error**: banner `#F6EBE7`/`#E6C9C1`, `!` en círculo `#B0685A`, título `#7C4033`. Campo: borde `#C98E80`, bg `#FDF7F5`, msg 12px.
- **Loading**: spinner `qspin` (borde line + top qpA) dentro de botones; sin pantalla dedicada.
- **Éxito**: check blanco en círculo qpA 88px, `shadow-glow`, Newsreader, 1 CTA.

## Verificación

- `pnpm tsc --noEmit`, `pnpm lint`.
- Smoke manual: sign-up nuevo (nombre+email → passkey → éxito → /configurar), sign-up con email existente (→ /sign-in?reason=exists), sign-in passkey, sign-in password, error credenciales.
- Actualizar `docs/auth-smoke.md` y pending-work (P0-8, P2-5 quedan absorbidos).
