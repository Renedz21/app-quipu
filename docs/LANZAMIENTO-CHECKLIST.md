# Checklist pre y post lanzamiento (Quipu móvil + web)

> **Documento local — NO se sube a GitHub** (`docs/` está en .gitignore).
> Crece con lo que vayamos encontrando. Última actualización: 2026-09-02.

## Antes de lanzar (bloqueantes)

### 1. Env vars de producción (Convex prod deployment)

- [ ] `BETTER_AUTH_SECRET` (≥32 chars, distinto del de dev)
- [ ] `SITE_URL` = dominio real de la web (ej. `https://quipu.pe`)
- [ ] `PASSKEY_RP_ID` = dominio real **sin** `https://` (ej. `quipu.pe`) — las passkeys de web y móvil deben nacer bajo el mismo rpID para compartirse
- [ ] `PASSKEY_ANDROID_APK_KEY_HASHES` = `hashPlayAppSigning,hashDebug` (separados por coma; el hash de debug solo si quieres que builds de dev creen passkeys contra prod)
- [ ] `RESEND_API_KEY` + dominio remitente verificado en Resend (si no, los correos OTP/verificación no salen en prod)
- [ ] `POLAR_*` (si billing aplica a esta release)

### 2. Dominio (passkeys nativas)

- [ ] **Android:** `https://<dominio>/.well-known/assetlinks.json` con package `com.quipu.finance` + SHA-256 del cert de **Play App Signing** (Play Console → Configuración → Firma de apps)
- [ ] **iOS:** `https://<dominio>/.well-known/apple-app-site-association` con `<TEAMID>.com.quipu.finance` en `webcredentials.apps` (sin extensión, servido como JSON)
- [ ] Verificar ambos con HTTPS válido y accesibles públicamente (Apple/Google los validan con sus bots)
- [ ] iOS: entitlement `webcredentials:<dominio>` en el build (app.json `ios.associatedDomains` / EAS)

### 3. Build y env móvil (EAS)

- [ ] `EXPO_PUBLIC_CONVEX_URL` y `EXPO_PUBLIC_CONVEX_SITE_URL` en los perfiles `preview`/`production` de EAS (apuntando al deployment de **prod**)
- [ ] Development build instalado en los dispositivos de prueba (passkeys NO funcionan en Expo Go)
- [ ] `scheme: quipu` presente en el build (deep links / expo-origin)

### 4. Código (ya hecho — solo verificar que sigue)

- [x] `trustedOrigins: [siteUrl, "quipu://"]` + plugin `expo()` en `convex/auth.ts`
- [x] `origin` del passkey plugin como array (web + hashes Android)
- [x] Rate limits `/email-otp/*` y por-email (`"otp"`)
- [ ] Regresión web completa: login passkey, login email+password, registro con enlace, reset de contraseña

### 5. Batería de pruebas en device (condición de release)

- [ ] Wizard completo: datos → OTP (código llega por correo real) → auto-verify → passkey → éxito
- [ ] OTP: input alineado en Android (letterSpacing), auto-verificación al 6.º dígito, error anunciado por screen reader, 3 intentos → "Demasiados intentos"
- [ ] Passkey real: crear → cerrar app → `signIn.passkey()` funciona; cancelar → "Pendiente" sin romper
- [ ] Login con email+password (usuario creado en web) y con passkey (usuario móvil)
- [ ] Restauración de sesión tras matar la app; logout
- [ ] Recuperación del wizard: matar app en paso 2 → re-registro con mismo email → OTP → continúa
- [ ] iOS: mismo wizard completo (AASA + Face ID)

## Después de lanzar (monitoreo y mantenimiento)

- [ ] Sentry: vigilar errores en `/api/auth/passkey/*` y `/email-otp/*`
- [ ] Si Play hace **key upgrade / rotación de firma** → añadir el hash nuevo al env (sin quitar el viejo)
- [ ] Correos en spam → revisar reputación del dominio en Resend (SPF/DKIM/DMARC)
- [ ] Si cambia bundle id o Team ID de Apple → actualizar assetlinks.json / AASA

## Deuda técnica conocida (fast-follow)

- [ ] **Seguridad web (prioritario):** endurecer `resolveUser` del passkey plugin en `convex/auth.ts` — hoy un POST directo a `/passkey/generate-register-options` con el email de otra persona permite registrar una passkey en su cuenta (account takeover vía API). La app móvil ya no lo expone como UI, pero el endpoint sigue abierto.
- [ ] Onboarding financiero móvil ("Configurar mi sistema" → `profiles.createProfile` con país del mockup)
- [ ] `emailSendLog`: kind `"otp"` dedicado (hoy el OTP solo tiene bucket propio, sin cooldown de log)
- [ ] Colores **dark mode** del móvil (corregir valores en `global.css`)
- [ ] Unificar bucket `authEmailOtp` en `rateLimit.ts` (está inline en `authRateLimit.ts`)
- [ ] Mensaje explicativo cuando la passkey falla por entorno (Expo Go) en vez de "Pendiente" a secas
- [ ] Doble correo en signup móvil (enlace + OTP): si molesta, evaluar suprimir el enlace para clientes móviles (requiere detectar origen en `sendVerificationEmail`)
