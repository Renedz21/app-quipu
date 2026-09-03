# Spec — Onboarding móvil con OTP + Passkey (wizard 3 pasos)

**Fecha:** 2026-09-01 · **Rama:** feat/mobile-auth-passkey · **Estado:** aprobado en chat (con las 4 correcciones)

## Objetivo

Reemplazar el registro por enlace de verificación en la app móvil por un wizard de 3 pasos (datos+contraseña → OTP → Passkey → éxito), manteniendo **una única identidad** compatible con la web: toda cuenta nace con contraseña y `emailVerified` comportamiento idéntico en ambos clientes. La web no cambia su flujo (enlaces).

## Decisiones aprobadas

1. **Contraseña obligatoria en el paso 1.** Cuentas nuevas móviles = mismas capacidades que cuentas web (login por password en ambos clientes). Sin "contraseña sin definir".
2. **OTP sustituye al enlace solo en móvil** vía plugin `emailOTP` de Better Auth (existe en 1.6.30, verificado en `dist/plugins/email-otp`). `overrideDefaultEmailVerification` **NO** se usa → la web sigue con enlaces intacta. Efecto secundario aceptado: en signup móvil llegan 2 correos (enlace automático + código); el enlace no se usa en móvil.
3. **Orden seguro:** la Passkey se registra **con sesión activa** (paso 3), nunca antes de verificar el correo. Cierra el vector de account takeover de `resolveUser` para el flujo del wizard (el endpoint pre-existe igual; su endurecimiento es fast-follow).
4. **Sesión transparente post-OTP:** tras `verifyEmail` exitoso, la app llama `signIn.email` con las credenciales en memoria. El usuario no re-escribe nada.
5. **País** sale del wizard → vive en el onboarding financiero ("Configurar mi sistema", fuera de este spec; `profiles.createProfile` ya lo espera).
6. **"Verificar después" no existe**: sin OTP no hay cuenta verificada ni sesión. El botón equivalente es cancelar el registro.
7. **Iconos:** sin app icon, sin tratamiento de status bar (el 9:41 del mockup es la máscara del device). Solo iconos funcionales: chevron atrás, checks de listas/resumen. El glifo Face ID dentro de botones se omite (botones solo texto).

## Flujos

### Registro (nuevo wizard — reemplaza `sign-up.tsx`)

```text
Paso 1 Datos:      nombre + email + contraseña → signUp.email
                   (cuenta creada, emailVerified=false, sin sesión;
                    envía enlace automático — se ignora en móvil)
Paso 2 OTP:        authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" })
                   input 6 dígitos + cooldown reenvío 60s ("REENVIAR EN 0:59")
                   → authClient.emailOtp.verifyEmail({ email, otp })   // emailVerified=true
                   → signIn.email({ email, password })                 // sesión (transparente)
Paso 3 Passkey:    authClient.passkey.addPasskey()   // con sesión; cancelable
Éxito:             resumen (Passkey ✓/pendiente · Correo: Verificado ✓ · Respaldo: Contraseña ✓)
                   → botón "Configurar mi sistema" (placeholder: navega a tabs)
```

Errores del paso 2: OTP inválido/expirado → mensaje + reintento; 3 intentos fallidos → pedir código nuevo (`TOO_MANY_ATTEMPTS`).

### Sign-in (rediseño según mockup, sin app icon)

```text
Titular "Divide tu dinero antes de gastarlo." + subtítulo
→ "Continuar con Passkey" (primario; signIn.passkey())
→ divisor
→ "Entrar con correo" → formulario email+password (el actual)
→ "¿Nuevo en Quipu? Crear cuenta" → wizard paso 1
```

Usuarios web existentes: entran con email+password o Passkey si ya la tienen. Sin cambios en el server para ellos.

## Cambios backend (apps/web — mínimos, sin tocar flujos web)

- `convex/auth.ts`: plugin `emailOTP({ otpLength: 6, expiresIn: 600, allowedAttempts: 3, storeOTP: "hash", sendVerificationOTP })`. **Sin** `overrideDefaultEmailVerification`. En `sendVerificationOTP`: `assertEmailAllowed(email)` y entrega vía nuevo helper.
- `convex/lib/email/authMail.ts` + `authTemplates.ts`: `sendOtpEmail({ to, otp })` con plantilla propia; en dev deployment loguea el código a consola (mismo patrón `isDevelopmentDeployment()` que los links).
- `convex/auth.ts` rateLimit.customRules: añadir `"/email-otp/*"` (p. ej. window 60, max 3).
- **La web no cambia**: mismos endpoints de siempre; el plugin añade rutas nuevas `/email-otp/*` que la web no consume.

## Cambios móvil (apps/mobile)

- `lib/auth-client.ts`: añadir `emailOTPClient()` (existe en better-auth/client/plugins 1.6.30, verificado).
- `(auth)/create-account.tsx`: **nuevo**, wizard con stepper interno (estado en memoria: nombre/email/password; pasos 1→2→3→éxito). Reemplaza a `sign-up.tsx` (se elimina).
- `(auth)/sign-in.tsx`: rediseño welcome según mockup (sin app icon); el formulario email+password queda como vista secundaria ("Entrar con correo").
- Sin cambios en `sign-in` logic de auth-client; FieldError reutilizado.
- Passkey en paso 3 requiere development build (limitación ya documentada; el wizard debe degradar con mensaje si `expoPasskeyClient` no está disponible en Expo Go).

## Seguridad

- OTP: 6 dígitos, 10 min, 3 intentos, almacenado hasheado, rate limit por IP/email.
- `assertEmailAllowed` también en el envío de OTP (política de dominios existente).
- La sesión para la Passkey viene de `signIn.email` con credenciales reales.
- Sin secretos nuevos en cliente; `EXPO_PUBLIC_*` sin cambios.

## Fuera de alcance (fast-follow)

- "Configurar mi sistema" (onboarding financiero / `profiles.createProfile` desde móvil).
- "Definir contraseña de respaldo" (no aplica: la contraseña ya existe).
- Endurecimiento del endpoint passkey `resolveUser` (vulnerabilidad pre-existente de la web).
- Asociaciones de dominio (AASA/assetlinks) para passkeys nativas en producción.
