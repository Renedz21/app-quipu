# Auth Smoke Test — Quipu v2.5

## Pre-requisitos
- `npx convex dev` corriendo (terminal 1).
- `pnpm dev` corriendo (terminal 2).
- Browsers: Chrome (WebAuthn + autofill) y Firefox (sin passkey platform).
- Cuenta de prueba limpia. Borrar el user de Better Auth en Convex dashboard entre runs.

## Casos

### A. Sign-up con passkey (usuario nuevo)
1. Ir a `http://localhost:3000/sign-up`.
2. (TODO: capturar email en el form antes de mostrar el botón. Por ahora el email está hardcoded.)
3. Click "Crear con Passkey".
4. Autorizar passkey con Touch ID / Windows Hello.
5. URL cambia a `/sign-up?status=success`.
6. Aparece status card verde "¡Listo!" con CTA "Configurar mi ciclo".
7. Click CTA → aterriza en `/onboarding` (placeholder).
8. ✅ Sesión activa, redirect correcto.

### B. Sign-in con passkey (usuario existente con profile)
1. (Pre-condición: usuario A ya completó P0-2 onboarding en una sesión previa.)
2. Logout (limpiar cookies).
3. Ir a `/sign-in`.
4. Click "Iniciar sesión con Passkey".
5. Autorizar passkey.
6. Redirect directo a `/dashboard` (sin status card, sin pasar por `?status=success`).
7. ✅ Sesión activa, aterriza en dashboard.

### C. Sign-in con email/password (fallback)
1. Ir a `/sign-in`.
2. Click "Usar otro método" → aterriza en `/sign-in/email`.
3. Tipear email y password de un usuario existente.
4. Redirect a `/dashboard` o `/onboarding` según profile.
5. ✅ Sesión activa.

### D. Sign-up con email/password
1. Ir a `/sign-up`.
2. Click "Usar otro método" → aterriza en `/sign-up/email`.
3. Tipear email nuevo + password (8+ chars).
4. URL cambia a `/sign-up?status=success`.
5. Status card verde aparece.
6. CTA "Configurar mi ciclo" → `/onboarding`.
7. ✅ Cuenta creada.

### E. Error de passkey cancelado
1. Ir a `/sign-in`.
2. Click "Iniciar sesión con Passkey".
3. Cancelar el prompt del OS.
4. Vuelve a la pantalla de sign-in sin mensaje (USER_CANCELLED no se muestra).
5. ✅ Sin error visible, foco vuelve al botón.

### F. Error de passkey expirado
1. Provocar un challenge viejo. Si no es fácil, saltear.
2. ✅ Esperado: status card `expired-error` con "Reintentar" (futuro: P2 mejora para mostrar el error en la misma pantalla en vez de redirect).

### G. Browser sin passkeys
1. Abrir `/sign-in` en Firefox.
2. Botón "Iniciar sesión con Passkey" deshabilitado con copy "Tu dispositivo no soporta Passkeys".
3. CTA "Usar otro método" sigue siendo el link secundario.
4. ✅ Passkey no ofrecida.

### H. Sesión ya activa (deep link)
1. Logueado, ir manualmente a `/sign-in` (URL pegada en barra).
2. Redirect a `/dashboard` o `/onboarding` según profile.
3. ✅ Nunca ve el form si ya está logueado.
