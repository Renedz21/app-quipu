# Mobile Auth: Better Auth + Convex + Passkeys (Expo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar `apps/mobile` (Expo 57) como segundo cliente de la infraestructura de autenticación existente (Better Auth + Convex en `apps/web`), con **Passkey como método principal** y email como complemento, sin crear autenticación paralela.

**Architecture:** El móvil habla directamente con `EXPO_PUBLIC_CONVEX_SITE_URL/api/auth/*` (rutas que `authComponent.registerRoutes` ya monta en `apps/web/convex/http.ts:10`). El cliente Better Auth guarda cookies/sesión en SecureStore vía `expoClient`; el plugin `expoPasskeyClient` ejecuta las ceremonias WebAuthn con APIs nativas (ASAuthorization iOS / Credential Manager Android). `ConvexBetterAuthProvider` inyecta el JWT que Convex ya sabe validar (`auth.config.ts` + `getAuthConfigProvider`), por lo que **todas** las queries/mutations con `ctx.auth.getUserIdentity()` funcionan sin cambios en backend. La web (Next.js) no se modifica.

**Tech Stack:** Expo SDK 57 · RN 0.86 · better-auth 1.6.30 · @convex-dev/better-auth 0.12.5 · @better-auth/expo 1.6.30 · expo-better-auth-passkey 1.4.3 · Convex 1.45

**Spec:** Conversación de auditoría (Fases 1–6 completadas) + `CONVEX-MOBILE-EXAMPLE.md` + guía oficial https://labs.convex.dev/better-auth/framework-guides/expo

## Global Constraints

- **Cero cambios en `apps/web/`** (código, deps, convex). Verificable: `git status apps/web packages/convex-api` debe estar vacío al final.
- better-auth queda pineado a **1.6.30** (override en `pnpm-workspace.yaml` lo fuerza en todo el workspace; no instalar 1.7.x).
- Passkey es el método **principal**; email es complemento (igual que la web).
- No crear: JWT paralelo, AsyncStorage para tokens, segundo provider, segunda instancia Better Auth.
- Solo dependencias mínimas justificadas (ver matriz Task 1). Nada "por si acaso".
- `expo-dev-client` ya está instalado; los módulos nativos de passkey **requieren development build** (no Expo Go).
- `rpID`/origen: las passkeys nativas requieren HTTPS con hostname = `PASSKEY_RP_ID`. En dev local las passkeys nativas no funcionarán (email sí). Esto es limitación de WebAuthn, no del código.

## Dependencias — qué y por qué (matriz final)

| Paquete | Versión | Por qué es indispensable |
|---|---|---|
| `better-auth` | 1.6.30 | El cliente (`createAuthClient` de `better-auth/react`). Sin esto no existe cliente de auth. |
| `@better-auth/expo` | 1.6.30 | Solo su plugin cliente `expoClient`: guarda cookies/sesión en SecureStore y las adjunta a cada request. Es el mecanismo oficial de sesión nativa. |
| `@convex-dev/better-auth` | 0.12.5 | `ConvexBetterAuthProvider` (react): convierte la sesión Better Auth en el JWT que `ConvexReactClient` envía a Convex. Sin esto `ctx.auth.getUserIdentity()` devuelve null y ningún dato protegido funciona. |
| `expo-better-auth-passkey` | 1.4.3 | Passkeys nativas. El `passkeyClient` oficial es browser-only (confirmado: issue better-auth#2235). Este módulo usa la misma API (`authClient.passkey.*`, `authClient.signIn.passkey`) con bindings nativos. |
| `expo-secure-store` | ~57 (expo install) | Storage seguro que consume `expoClient`. Peer obligatorio. |
| `expo-network` | SDK 57 (expo install) | Peer de `expoClient` (detección de estado de red). Obligatorio por contrato del plugin. |

**Explícitamente NO se instalan:**
- `expo-web-browser` — solo sirve para OAuth social (Google), fuera de alcance. Verificación en Task 1: si el dist de `@better-auth/expo/client` lo importa a nivel top-level, pnpm lo auto-instalará como peer; en ese caso se deja (es parte del contrato del plugin, no un capricho) pero **no se declara como dependencia directa**.
- `expo-linking`, `expo-constants` — ya están en el árbol vía `expo-router`; se consumen como peers resueltos.
- Server plugin `expo()` en `apps/web/convex/auth.ts` — solo se necesita para social sign-in con deep links y redirects. Los flujos implementados (email, passkey con `createSession`) no usan redirects. **Riesgo documentado:** si Better Auth rechazara POSTs sin header `Origin` (React Native no lo envía), el fix sería añadir `expo()` + `trustedOrigins: ["quipu://"]` en la web — decisión explícita del usuario, no se hace por defecto.

---

### Task 1: Instalar dependencias mínimas y verificar peers

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: paquetes disponibles para importar en Tasks 3–7: `better-auth/react#createAuthClient`, `@better-auth/expo/client#expoClient`, `@convex-dev/better-auth/react#ConvexBetterAuthProvider`, `expo-better-auth-passkey#expoPasskeyClient`, `expo-secure-store`, `expo-constants`.

- [ ] **Step 1: Instalar paquetes de auth (versiones exactas)**

```bash
pnpm --filter @quipu/mobile add better-auth@1.6.30 @better-auth/expo@1.6.30 @convex-dev/better-auth@0.12.5 expo-better-auth-passkey@1.4.3
```

- [ ] **Step 2: Instalar peers Expo con versión del SDK correcta**

```bash
pnpm --filter @quipu/mobile exec expo install expo-secure-store expo-network
```

- [ ] **Step 3: Verificar peers no declarados (evidencia, no suposición)**

```bash
pnpm --filter @quipu/mobile why nanostores
pnpm --filter @quipu/mobile why expo-web-browser
Get-ChildItem "node_modules\.pnpm" -Directory -Filter "@better-auth+expo@1.6.30*" | ForEach-Object { Select-String -Path "$($_.FullName)\node_modules\@better-auth\expo\dist\client\*.mjs" -Pattern "expo-web-browser" -List }
```

Esperado: `nanostores` resuelto (dependencia de better-auth / auto-install-peers). Si `expo-web-browser` aparece como import top-level del dist cliente, pnpm lo habrá auto-instalado como peer: verificar con `pnpm --filter @quipu/mobile why expo-web-browser` y dejarlo así (no declarar directo). Si pnpm emite warnings de peer no resueltos, añadir el paquete faltante con `pnpm --filter @quipu/mobile add <pkg>`.

- [ ] **Step 4: Confirmar que la web no cambió**

```bash
git status --short apps/web
```

Esperado: salida vacía.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): add better-auth + expo + passkey deps"
```

---

### Task 2: Variables de entorno del móvil

**Files:**
- Modify: `apps/mobile/.env` (gitignored)
- Modify: `apps/mobile/.env.example`

**Interfaces:**
- Produces: `EXPO_PUBLIC_CONVEX_SITE_URL` (URL `.convex.site`, la que monta las rutas `/api/auth/*`) y `EXPO_PUBLIC_CONVEX_URL` (ya existente, cliente Convex).

- [ ] **Step 1: Copiar el site URL del deployment (sin imprimirlo)**

```bash
$site = (Select-String -Path "apps/web/.env.local" -Pattern "^NEXT_PUBLIC_CONVEX_SITE_URL=(.+)$").Matches[0].Groups[1].Value.Trim()
Add-Content -Path "apps/mobile/.env" -Value "EXPO_PUBLIC_CONVEX_SITE_URL=$site"
```

Si `apps/web/.env.local` no existe o no tiene la var, pedirla al usuario (no adivinar). En EAS ya se inyecta por perfiles (`eas.json`), igual que `EXPO_PUBLIC_CONVEX_URL`.

- [ ] **Step 2: Actualizar `.env.example`**

Añadir al final de `apps/mobile/.env.example`:

```bash
# Convex HTTP site (rutas /api/auth de Better Auth). Mismo deployment que
# EXPO_PUBLIC_CONVEX_URL pero terminando en .site
EXPO_PUBLIC_CONVEX_SITE_URL=https://YOUR-DEPLOYMENT.convex.site
```

- [ ] **Step 3: Commit (solo .env.example)**

```bash
git add apps/mobile/.env.example
git commit -m "chore(mobile): document EXPO_PUBLIC_CONVEX_SITE_URL"
```

---

### Task 3: Cliente de auth (`lib/auth-client.ts`)

**Files:**
- Create: `apps/mobile/lib/auth-client.ts`

**Interfaces:**
- Consumes: `EXPO_PUBLIC_CONVEX_SITE_URL` (Task 2), scheme `quipu` de `app.json`.
- Produces: `authClient` (instancia Better Auth client con plugins `convexClient`, `expoClient`, `expoPasskeyClient`) — la consumen el provider (Task 4), las pantallas (Tasks 5–6) y el logout (Task 7). El challenge cookie de passkey es `better-auth-passkey` (server, default) → prefijo `better-auth` = default de `expoClient` ✓ (no se toca `cookiePrefix`).

- [ ] **Step 1: Crear el archivo**

```ts
import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { expoPasskeyClient } from "expo-better-auth-passkey";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const scheme = Constants.expoConfig?.scheme ?? "quipu";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    convexClient(),
    expoClient({
      scheme,
      storagePrefix: scheme,
      storage: SecureStore,
    }),
    expoPasskeyClient(),
  ],
});
```

- [ ] **Step 2: Verificar que los exports existen en las versiones instaladas**

```bash
pnpm --filter @quipu/mobile exec node -e "console.log(Object.keys(require('expo-better-auth-passkey')))"
```

Esperado: incluye `expoPasskeyClient`. Si el paquete es ESM-only, verificar por tipos: `pnpm --filter @quipu/mobile typecheck` tras Task 3 y ajustar el import según el error (el README oficial usa exactamente `import { expoPasskeyClient } from 'expo-better-auth-passkey'`).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/auth-client.ts
git commit -m "feat(mobile): add better-auth client with expo + native passkey plugins"
```

---

### Task 4: Provider Convex + gate de sesión en el layout

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/shared/components/auth/auth-gate.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `authClient` (Task 3).
- Produces: `AuthGate({ children })` — componente que renderiza `children` solo con sesión activa y redirige a `/sign-in` si no la hay. Restauración de sesión: `expoClient` cachea la sesión en SecureStore, `useSession` la resuelve al arrancar (mientras `isPending`, AuthGate renderiza `null` y el splash sigue visible).

- [ ] **Step 1: Crear `shared/components/auth/auth-gate.tsx`**

```tsx
import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  if (!session) return <Redirect href="/sign-in" />;

  return <>{children}</>;
}
```

- [ ] **Step 2: Envolver el contenido protegido en `(tabs)/_layout.tsx`**

En `apps/mobile/app/(tabs)/_layout.tsx` añadir el import y envolver el retorno de `TabLayout`:

```tsx
import AuthGate from "@/shared/components/auth/auth-gate";
```

```tsx
  return (
    <AuthGate>
      <View style={{ flex: 1 }}>
        {/* ...contenido existente sin cambios... */}
      </View>
    </AuthGate>
  );
```

- [ ] **Step 3: Montar `ConvexBetterAuthProvider` en `app/_layout.tsx`**

Cambios en `apps/mobile/app/_layout.tsx`:

```tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import {
  ConvexBetterAuthProvider,
  type AuthClient,
} from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client";
```

El cliente Convex pausa queries hasta que haya token (`expectAuth: true`, recomendación de la guía oficial — todas las funciones que consume el móvil dependen de identidad):

```tsx
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL ?? "", {
  unsavedChangesWarning: false,
  expectAuth: true,
});
```

Y en el JSX (envolviendo `RootLayoutNav`, que no cambia):

```tsx
        <ConvexProvider client={convex}>
          <ConvexBetterAuthProvider
            client={convex}
            authClient={authClient as unknown as AuthClient}
          >
            <RootLayoutNav />
          </ConvexBetterAuthProvider>
        </ConvexProvider>
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @quipu/mobile typecheck
```

Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/_layout.tsx "apps/mobile/app/(tabs)/_layout.tsx" apps/mobile/shared/components/auth/auth-gate.tsx
git commit -m "feat(mobile): convex auth provider + session gate"
```

---

### Task 5: Pantalla Sign-In (passkey primario + email fallback)

**Files:**
- Create: `apps/mobile/app/sign-in.tsx`

**Interfaces:**
- Consumes: `authClient` (Task 3).
- Produces: ruta `/sign-in`. Si ya hay sesión → `<Redirect href="/(tabs)" />`.

- [ ] **Step 1: Crear `app/sign-in.tsx`**

```tsx
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { authClient } from "@/lib/auth-client";

export default function SignInScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/(tabs)" />;

  const signInWithPasskey = async () => {
    setError(null);
    setLoading(true);
    const { error } = await authClient.signIn.passkey();
    setLoading(false);
    if (error) {
      setError(error.message ?? "No se pudo iniciar sesión");
      return;
    }
    router.replace("/(tabs)");
  };

  const signInWithEmail = async () => {
    setError(null);
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Email o contraseña incorrectos");
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <View className="flex-1 justify-center gap-6 bg-[#FBFAF7] px-6">
      <View className="gap-1">
        <Text className="font-newsreader text-[28px] text-foreground">
          Quipu
        </Text>
        <Text className="font-hanken text-[14px] text-foreground/55">
          Inicia sesión con tu passkey o tu cuenta.
        </Text>
      </View>

      <Pressable
        onPress={() => void signInWithPasskey()}
        disabled={loading}
        className="items-center rounded-xl bg-foreground px-5 py-3.5"
      >
        {loading ? (
          <ActivityIndicator color="#FBFAF7" />
        ) : (
          <Text className="font-hanken-semibold text-[15px] text-[#FBFAF7]">
            Iniciar sesión con Passkey
          </Text>
        )}
      </Pressable>

      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-[#E8E6DF]" />
        <Text className="font-geist-mono text-[10.5px] text-foreground/45 uppercase">
          o con email
        </Text>
        <View className="h-px flex-1 bg-[#E8E6DF]" />
      </View>

      <View className="gap-3">
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          placeholder="Email"
          className="rounded-xl border border-[#E8E6DF] px-4 py-3 font-hanken text-[15px] text-foreground"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
          secureTextEntry
          placeholder="Contraseña"
          className="rounded-xl border border-[#E8E6DF] px-4 py-3 font-hanken text-[15px] text-foreground"
        />
        <Pressable
          onPress={() => void signInWithEmail()}
          disabled={loading || !email || !password}
          className="items-center rounded-xl border border-[#E8E6DF] px-5 py-3.5"
        >
          <Text className="font-hanken-semibold text-[15px] text-foreground">
            Iniciar sesión
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text className="font-hanken text-[13px] text-[#B4482F]">{error}</Text>
      ) : null}

      <View className="flex-row justify-center gap-1">
        <Text className="font-hanken text-[13px] text-foreground/55">
          ¿No tienes cuenta?
        </Text>
        <Pressable onPress={() => router.push("/sign-up")}>
          <Text className="font-hanken-semibold text-[13px] text-foreground">
            Crear cuenta
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm --filter @quipu/mobile typecheck
pnpm --filter @quipu/mobile lint
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/sign-in.tsx
git commit -m "feat(mobile): sign-in screen (passkey-first + email)"
```

---

### Task 6: Pantalla Sign-Up (passkey-first + email fallback)

**Files:**
- Create: `apps/mobile/app/sign-up.tsx`

**Interfaces:**
- Consumes: `authClient` (Task 3). El server ya soporta passkey-first: `registration.requireSession: false` + `resolveUser` que parsea el email desde `context` (`apps/web/convex/auth.ts:131-155`), sin cambiar el server.
- Produces: ruta `/sign-up`. Registro passkey-first: `addPasskey({ context: email, createSession: true })` → crea usuario + passkey + sesión en una sola ceremonia.

- [ ] **Step 1: Verificar API del plugin instalado (no asumir)**

```bash
Select-String -Path "node_modules\.pnpm\@better-auth+passkey@1.6.30_*\node_modules\@better-auth\passkey\dist\client.d.mts" -Pattern "context|createSession"
```

Esperado: ambos presentes. Si `createSession` NO existiera en 1.6.30, usar fallback: `signUp.email` (Task 6 Step 3) como flujo único y dejar el passkey-first documentado como pendiente (no inventar API).

- [ ] **Step 2: Crear `app/sign-up.tsx`**

```tsx
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { authClient } from "@/lib/auth-client";

export default function SignUpScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/(tabs)" />;

  const signUpWithPasskey = async () => {
    setError(null);
    setLoading(true);
    // Passkey-first: el server resuelve/crea el usuario con `context` (email)
    // y crea la sesión tras verificar la credencial.
    const { error } = await authClient.passkey.addPasskey({
      context: email,
      createSession: true,
    });
    setLoading(false);
    if (error) {
      setError(error.message ?? "No se pudo crear la cuenta");
      return;
    }
    router.replace("/(tabs)");
  };

  const signUpWithEmail = async () => {
    setError(null);
    setLoading(true);
    const { error } = await authClient.signUp.email({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "No se pudo crear la cuenta");
      return;
    }
    // requireEmailVerification está activo en el server: la verificación se
    // hace desde el email (el enlace abre la web). Sin sesión hasta verificar.
    setError("Revisa tu correo y verifica tu cuenta desde el enlace.");
  };

  return (
    <View className="flex-1 justify-center gap-6 bg-[#FBFAF7] px-6">
      <View className="gap-1">
        <Text className="font-newsreader text-[28px] text-foreground">
          Crea tu cuenta
        </Text>
        <Text className="font-hanken text-[14px] text-foreground/55">
          Tu llave de acceso (passkey) es tu método principal.
        </Text>
      </View>

      <View className="gap-3">
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          placeholder="Email"
          className="rounded-xl border border-[#E8E6DF] px-4 py-3 font-hanken text-[15px] text-foreground"
        />
        <Pressable
          onPress={() => void signUpWithPasskey()}
          disabled={loading || !email}
          className="items-center rounded-xl bg-foreground px-5 py-3.5"
        >
          {loading ? (
            <ActivityIndicator color="#FBFAF7" />
          ) : (
            <Text className="font-hanken-semibold text-[15px] text-[#FBFAF7]">
              Crear cuenta con Passkey
            </Text>
          )}
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-[#E8E6DF]" />
        <Text className="font-geist-mono text-[10.5px] text-foreground/45 uppercase">
          o con email
        </Text>
        <View className="h-px flex-1 bg-[#E8E6DF]" />
      </View>

      <View className="gap-3">
        <TextInput
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          secureTextEntry
          placeholder="Contraseña"
          className="rounded-xl border border-[#E8E6DF] px-4 py-3 font-hanken text-[15px] text-foreground"
        />
        <Pressable
          onPress={() => void signUpWithEmail()}
          disabled={loading || !email || !password}
          className="items-center rounded-xl border border-[#E8E6DF] px-5 py-3.5"
        >
          <Text className="font-hanken-semibold text-[15px] text-foreground">
            Crear cuenta con email
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text className="font-hanken text-[13px] text-foreground/70">
          {error}
        </Text>
      ) : null}

      <View className="flex-row justify-center gap-1">
        <Text className="font-hanken text-[13px] text-foreground/55">
          ¿Ya tienes cuenta?
        </Text>
        <Pressable onPress={() => router.replace("/sign-in")}>
          <Text className="font-hanken-semibold text-[13px] text-foreground">
            Iniciar sesión
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

```bash
pnpm --filter @quipu/mobile typecheck
pnpm --filter @quipu/mobile lint
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/sign-up.tsx
git commit -m "feat(mobile): passkey-first sign-up screen"
```

---

### Task 7: Logout

**Files:**
- Create: `apps/mobile/shared/components/auth/sign-out-button.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx` (cabecera, línea ~140)

**Interfaces:**
- Consumes: `authClient` (Task 3).
- Produces: `<SignOutButton />`. `authClient.signOut()` invalida la sesión en el server y limpia SecureStore; el gate (Task 4) redirige a `/sign-in` al perder la sesión.

- [ ] **Step 1: Crear el botón**

```tsx
import { Pressable, Text } from "react-native";
import { authClient } from "@/lib/auth-client";

export default function SignOutButton() {
  return (
    <Pressable hitSlop={12} onPress={() => void authClient.signOut()}>
      <Text className="font-hanken-semibold text-[12px] text-foreground/45">
        Salir
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Colocarlo en la cabecera de `(tabs)/index.tsx`**

En la fila de cabecera (el `View` con `className="flex-row items-center justify-between"` que contiene `{cycleLabel} · Día ...` y el pill "Estable"), envolver el pill y el botón:

```tsx
        <View className="flex-row items-center gap-1.5 rounded-full bg-stable/15 px-2.5 py-1">
          {/* ...pill existente sin cambios... */}
        </View>
```

queda como:

```tsx
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1.5 rounded-full bg-stable/15 px-2.5 py-1">
            {/* ...pill existente sin cambios... */}
          </View>
          <SignOutButton />
        </View>
```

con `import SignOutButton from "@/shared/components/auth/sign-out-button";` al inicio.

- [ ] **Step 3: Typecheck + lint**

```bash
pnpm --filter @quipu/mobile typecheck
pnpm --filter @quipu/mobile lint
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/shared/components/auth/sign-out-button.tsx "apps/mobile/app/(tabs)/index.tsx"
git commit -m "feat(mobile): sign-out button"
```

---

### Task 8: Verificación end-to-end (Casos A–F)

**Files:** ninguno (solo pruebas). Requiere: `pnpm --filter @quipu/web convex:dev` corriendo, `apps/web/.env.local` con el mismo deployment, development build (`pnpm --filter @quipu/mobile ios` / `android`) — **no Expo Go** para passkeys.

- [ ] **Step 1: Build de desarrollo del móvil**

```bash
pnpm --filter @quipu/mobile start
# en otra terminal, con dispositivo/simulador:
pnpm --filter @quipu/mobile ios   # o android
```

- [ ] **Step 2: Caso A — usuario nuevo**

Crear cuenta con passkey-first (`/sign-up` → email → FaceID/huella). Esperado: sesión creada, redirección a tabs, Convex ejecuta queries autenticadas (sin errores "Unauthenticated" en los logs de Metro). El perfil será `null` (onboarding móvil no existe aún) — es esperado.

- [ ] **Step 3: Caso B — usuario existente**

Sign-out y `/sign-in` con Passkey (passkey creada en el paso anterior). Esperado: sesión + tabs.

- [ ] **Step 4: Caso C — restauración de sesión**

Matar la app y reabrirla. Esperado: splash breve → tabs directamente (sesión desde SecureStore), sin pantalla de login.

- [ ] **Step 5: Caso D — logout**

Pulsar "Salir". Esperado: vuelve a `/sign-in`; al intentar abrir tabs de nuevo no hay datos.

- [ ] **Step 6: Caso E — usuario no autenticado**

Con la app en `/sign-in`, verificar en logs de Convex (`convex dev`) que no se ejecutan queries autenticadas (`expectAuth: true` las pausa).

- [ ] **Step 7: Caso F — regresión web (obligatorio)**

```bash
git status --short apps/web packages/convex-api   # esperado: vacío
pnpm --filter @quipu/web typecheck
pnpm --filter @quipu/web test -- --run
```

Más smoke manual: login web con passkey y email siguen funcionando (no se tocó el server; confirmar que el deployment de Convex no fue re-desplegado).

- [ ] **Step 8: Passkey creada en web → usada en móvil (condicional)**

Solo aplica en producción/staging con dominio real: una passkey web es utilizable desde móvil si `PASSKEY_RP_ID` es el dominio productivo y el dominio sirve `apple-app-site-association` / `assetlinks.json` (requisito de WebAuthn, no código). En dev local: documentado como limitación, no bloqueante.

## Riesgos conocidos (documentados, no bloqueantes)

1. **Expo Go**: passkeys nativas requieren development build (`expo-dev-client` ya presente).
2. **Dev local**: WebAuthn exige HTTPS + hostname = `rpID`; passkeys nativas solo funcionan contra dominio real (prod/staging o túnel con dominio asociado). Email/password funciona en local sin restricciones.
3. **Server plugin `expo()` ausente**: correcto para email+passkey. Si se añade Google (fase futura), será necesario añadir `expo()` + `trustedOrigins: ["quipu://"]` en la web — decisión explícita, un solo archivo.
4. **Onboarding móvil**: un usuario nuevo vía passkey-first tiene `profile = null`; las pantallas actuales usan datos mock, sin crash. Onboarding móvil es trabajo posterior.
5. **`expo-web-browser` transitivo**: si pnpm lo auto-instala como peer de `@better-auth/expo`, queda en el lockfile aunque no se use (contrato del plugin).
