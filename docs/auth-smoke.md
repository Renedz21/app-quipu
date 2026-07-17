# Auth Smoke Test — Quipu v2.5 (canon redesign)

## Pre-requisitos
- `npx convex dev` corriendo (terminal 1).
- `pnpm dev` corriendo (terminal 2).
- Browsers: Chrome (WebAuthn + autofill) y Firefox (sin passkey platform).
- Cuenta de prueba limpia. Borrar el user de Better Auth en Convex dashboard entre runs.

## Rutas activas

| Ruta | Qué renderiza |
|---|---|
| `/sign-in` | Split-panel: email step → password step (inline, sin redirect). Passkey disponible en ambos pasos. |
| `/sign-up` | 3 pasos inline: form (name+email) → passkey setup → status success. |
| `/auth` | Redirect a `/sign-in`. |
| `/sign-in?email=X&reason=exists` | Sign-in con email pre-cargado, banner "Ya tienes cuenta". (Viene de sign-up cuando el email ya existe.) |

## Casos

### A. Sign-up con email + passkey (usuario nuevo)
1. Ir a `http://localhost:3000/sign-up`.
2. Tipear nombre y email nuevo.
3. Click "Crear cuenta".
4. App crea cuenta con contraseña aleatoria interna, pasa a paso 2.
5. Aparece escudo canon + CTA "Crear passkey".
6. Click "Crear passkey" → autorizar con Touch ID / Windows Hello.
7. Aparece check verde + mensaje "Tu cuenta está lista" + CTA "Ir al onboarding →".
8. Click CTA → aterriza en `/configurar` (placeholder de onboarding).
9. Sesión activa, redirect correcto.

### B. Sign-up con email que ya existe
1. Ir a `/sign-up`.
2. Tipear email de un usuario existente.
3. Click "Crear cuenta".
4. Redirect a `/sign-in?email=X&reason=exists`.
5. Banner "Ya tienes cuenta" visible en sign-in.
6. Email pre-cargado, solo pedir contraseña o passkey.
7. Login exitoso → redirect a `/dashboard`.

### C. Sign-in con passkey (usuario existente con profile)
1. Pre-condición: usuario ya completó onboarding (tiene profile).
2. Logout (limpiar cookies).
3. Ir a `/sign-in`.
4. Click "Entrar con passkey".
5. Autorizar passkey.
6. Redirect directo a `/dashboard` (sin status card).
7. Sesión activa, aterriza en dashboard.

### D. Sign-in con passkey (conditional autofill)
1. Ir a `/sign-in` en Chrome.
2. Si hay una passkey guardada, el autofill (condition UI) la ofrece automáticamente.
3. Seleccionar passkey del autofill.
4. Autenticar → redirect a `/dashboard`.
5. Sin tocar botones, flujo automático.

### E. Sign-in con email + password (2-step)
1. Ir a `/sign-in`.
2. Tipear email de usuario existente.
3. Click "Continuar".
4. Avanza al paso password. Email visible en pill editable ("Usar otro correo").
5. Tipear password.
6. Click "Continuar" → redirect a `/dashboard` o `/onboarding`.
7. Sesión activa.

### F. Sign-in — credencial inválida
1. Ir a `/sign-in`, email de usuario existente, password incorrecto.
2. Banner error "No pudimos iniciar sesión" aparece bajo el título.
3. El campo password se marca inválido (`aria-invalid`).
4. Corregir password → submit → éxito.

### G. Sign-in — passkey fallido
1. Ir a `/sign-in`.
2. Click "Entrar con passkey" → cancelar prompt del OS.
3. (Sin error visible — USER_CANCELLED se silencia.)
4. Click "Entrar con passkey" de nuevo → esta vez dejar expirar.
5. Banner error "No pudimos verificar tu passkey" aparece.
6. Usar password como fallback.

### H. Sign-up — server error
1. Ir a `/sign-up`.
2. Tipear datos válidos.
3. (Simular error: desconectar Convex dev, o forzar error de red.)
4. Banner "No pudimos crear tu cuenta" aparece bajo el lede.
5. Corregir (reconectar Convex) → re-intentar → éxito.

### I. Browser sin passkeys
1. Abrir `/sign-in` en Firefox.
2. No aparece "Entrar con passkey" ni separador.
3. Flujo email → password funciona normalmente.
4. Passkey no ofrecida.

### J. Sesión ya activa (deep link)
1. Logueado, ir manualmente a `/sign-in`.
2. Redirect a `/dashboard` (o `/onboarding` si no tiene profile).
3. Nunca ve el form si ya está logueado.

### K. Responsive / mobile
1. Abrir `/sign-in` en viewport < 1024px.
2. Panel lateral no se renderiza (hidden en mobile).
3. Logo `QuipuLogo` aparece arriba (reemplaza panel).
4. Título cambia a "Bienvenido de vuelta." (serif, 28px).
5. Abrir `/sign-up` en mobile.
6. Gradiente radial de fondo según paso, centrado vertical.

## Lo que NO se prueba aquí

- Onboarding completo (es smoke de auth, no de onboarding).
- Dashboard real (placeholder).
- Email/password sign-up completo con contraseña elegida por el usuario (status quo: passkey-first con contraseña aleatoria interna).

## Lo que cambió (vs smoke anterior)

- `/sign-in/email` y `/sign-up/email` eliminados. Flujos inline en las rutas principales.
- Sign-up captura email real en el form (no más `placeholder@quipu.pe`).
- Sign-in es 2-step (email → password) con split-panel en desktop.
- Passkey aparece dentro del flujo, no en ruta separada.
- Sign-up tiene 3 pasos: form → passkey → éxito.
- `/auth` redirige a `/sign-in`.
