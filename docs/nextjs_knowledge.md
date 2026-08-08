# Estrategias de Renderizado y Optimización en Next.js 16+ (App Router): Documento de Referencia

## TL;DR
- En Next.js 16 el modelo mental cambió: **todo es dinámico por defecto** y tú decides explícitamente qué cachear con la directiva `use cache` (activada con `cacheComponents: true`). El Partial Prerendering (PPR) dejó de ser experimental y es ahora el comportamiento por defecto cuando activas Cache Components: cada ruta produce un "shell" estático que se sirve al instante y "agujeros" dinámicos que llegan por streaming dentro de `<Suspense>`.
- La decisión "micro" (componente por componente) se reduce a tres preguntas por pieza de UI: (1) ¿necesita interactividad/estado/APIs del navegador? → Client Component; (2) ¿sus datos son los mismos para todos y tolera cierta antigüedad? → `use cache`; (3) ¿sus datos dependen de la request (cookies, headers, searchParams) o deben ser siempre frescos? → envolver en `<Suspense>` para que haga streaming. Empuja los boundaries de `'use client'` lo más abajo posible en el árbol.
- Optimizaciones más allá de `memo`: paraleliza fetches con `Promise.all` y evita waterfalls; deduplica con `React.cache()`; usa `use cache` + `cacheLife` + `cacheTag` para caché granular; Server Actions para mutaciones y Route Handlers para APIs externas; `next/image` con `preload` (el antiguo `priority` quedó deprecado en v16), `next/font`, `next/dynamic` para code-splitting, y coloca el elemento LCP fuera de los boundaries de Suspense.

---

## Key Findings

1. **Next.js 16 (estable desde el 21 de octubre de 2025) invirtió el modelo de caché.** Antes (v13–14) el App Router cacheaba de forma implícita y confusa; ahora nada se cachea por defecto y el caché es totalmente opt-in mediante `use cache`. Esto obliga a pensar deliberadamente qué es cacheable.
2. **PPR ya no es experimental.** Los flags `experimental.ppr` y `experimental_ppr` fueron eliminados. PPR es ahora la mecánica interna de "Cache Components". El shell estático (todo lo que es `use cache`, determinista, o el fallback de un `<Suspense>`) se prerenderiza; los agujeros dinámicos hacen streaming.
3. **APIs de request ahora son asíncronas y obligatorias.** `cookies()`, `headers()`, `draftMode()`, `params` y `searchParams` deben ser `await`-eados. El acceso síncrono se eliminó por completo en v16.
4. **Turbopack es el bundler por defecto** en `next dev` y `next build`. El post oficial de Next.js 16 lo describe así: *"Turbopack (stable): Default bundler for all apps with up to 5-10x faster Fast Refresh, and 2-5x faster builds"*. El React Compiler tiene soporte estable integrado desde la primera 16.0.
5. **`cacheLife`, `cacheTag` son estables** (sin prefijo `unstable_`). Aparecieron nuevas primitivas de invalidación: `updateTag` (read-your-writes en Server Actions), `refresh` (refresca datos no cacheados), y `revalidateTag` ahora requiere un segundo argumento (perfil, p.ej. `'max'`).
6. **`middleware.ts` fue reemplazado por `proxy.ts`** (corre en Node.js, no Edge) y está deprecado. Cache Components requiere el runtime de Node.js.
7. **La regla micro fundamental sigue siendo la misma que en React:** Server Component por defecto; `'use client'` sólo cuando hay interactividad; empuja el boundary de cliente hacia las hojas del árbol; pasa Server Components como `children` a Client Components en vez de importarlos dentro.

---

## Details

### 1. El modelo mental fundamental: Server Components vs Client Components

En el App Router, **todo componente es un React Server Component (RSC) por defecto**. Un RSC se ejecuta en el servidor, puede acceder directamente a bases de datos, sistema de archivos y secretos, y **no envía JavaScript al navegador** — sólo su salida renderizada. Un Client Component se declara con la directiva `'use client'` al inicio del archivo, se ejecuta en el navegador, y puede usar estado, efectos, event handlers y APIs del navegador.

**Criterios claros para decidir (árbol de decisión por componente):**

```
¿El componente necesita alguna de estas cosas?
  - useState / useReducer / useContext (estado)
  - useEffect / useLayoutEffect (efectos)
  - event handlers (onClick, onChange, onSubmit...)
  - APIs del navegador (window, localStorage, IntersectionObserver...)
  - hooks de librerías cliente (framer-motion, react-hook-form...)
        │
        ├── SÍ → Client Component ('use client')
        │
        └── NO → Server Component (por defecto; no hagas nada)
                 Ideal para: fetch de datos, acceso a DB/FS,
                 contenido estático, SEO, cero JS al cliente.
```

**Cómo funciona el boundary `'use client'` (esto es lo que la mayoría entiende mal):**

Cuando marcas un archivo con `'use client'`, **todos los módulos que ese archivo importa y los componentes que renderiza directamente entran al bundle del cliente**. La directiva se pone una sola vez en la "frontera"; no hace falta repetirla en cada componente hijo importado. Por eso conviene poner `'use client'` lo más abajo (cerca de las hojas) posible: cuanto más arriba lo pongas, más árbol se convierte en cliente y más JavaScript envías.

**El patrón clave para no "contaminar" el árbol:** los Client Components **pueden recibir Server Components como `children` o props**, y esos hijos NO entran al bundle del cliente. La relación padre/hijo no determina el boundary; lo que importa es **quién importa a quién**.

```tsx
// ✅ BIEN: el provider de cliente envuelve children, pero children siguen siendo Server Components
// app/layout.tsx (Server Component)
import { ThemeProvider } from './theme-provider' // Client Component

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {/* ThemeProvider es cliente, pero {children} se renderiza en el servidor */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

```tsx
// theme-provider.tsx
'use client'
import { createContext } from 'react'
export const ThemeContext = createContext(null)
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
}
```

**El patrón "islas de interactividad":** renderiza la mayor parte de la página en el servidor (texto, layout, datos) y coloca pequeñas "islas" de Client Components sólo donde hay interacción (un botón de "me gusta", un buscador, un carrusel). Ejemplo: un `Nav` server-rendered con una lista de `Links` cliente para mostrar el estado activo, o una lista de posts servidor con un `LikeButton` cliente por post.

**Anti-patrones comunes:**
- Marcar toda la página con `'use client'` "por si acaso" → mata el beneficio de los RSC.
- Importar un Server Component *dentro* de un Client Component (en vez de pasarlo como `children`) → lo convierte implícitamente en cliente o falla.
- Pasar funciones no serializables como props de Server a Client (sólo se pueden pasar datos serializables y Server Actions).

> **Cuidado con las fugas de secretos:** como los módulos se comparten entre grafos, es fácil importar código de servidor en el cliente por accidente. Sólo las variables de entorno con prefijo `NEXT_PUBLIC_` llegan al cliente; las demás se reemplazan por cadena vacía. Usa el paquete `server-only` para que un módulo de servidor falle en build si se importa desde el cliente.

---

### 2. Las estrategias de renderizado, una por una

Antes de v16 se hablaba de SSR/SSG/ISR como "modos" a nivel de ruta. Con Cache Components, **el modo ya no se elige por página sino por región dentro de la página**. Aun así conviene tener claras las definiciones porque el vocabulario sigue vivo y describen comportamientos que Next.js sigue produciendo.

| Estrategia | Qué es | Cuándo usarla | Trade-offs | Cómo se logra en Next.js 16 |
|---|---|---|---|---|
| **SSG / Prerender estático** | HTML generado en build time, servido desde CDN | Contenido igual para todos que casi no cambia (landing, docs) | Datos "congelados" hasta el próximo build/revalidación | Componente sin datos dinámicos, o `use cache` con `cacheLife('max')` |
| **ISR (regeneración incremental)** | Estático + revalidación periódica o on-demand | Catálogos, blogs, contenido que cambia cada X tiempo | Puede servir contenido algo antiguo (stale-while-revalidate) | `use cache` + `cacheLife(...)` con `revalidate`, o `cacheTag` + `revalidateTag` |
| **SSR (dinámico por request)** | HTML renderizado en el servidor en cada request | Contenido personalizado o siempre fresco (dashboards) | Mayor TTFB, coste de cómputo por request | Componente que lee `cookies()`/`headers()`/`searchParams` envuelto en `<Suspense>` |
| **CSR (cliente)** | Render en el navegador | Interactividad, estado, APIs de browser | Envía JS, peor SEO/LCP si se abusa | `'use client'` |
| **Streaming (Suspense)** | Envío incremental de HTML por chunks | Cuando parte de la página es lenta de calcular | Puede causar CLS si los skeletons no reservan espacio | `<Suspense>` boundaries o `loading.tsx` |
| **PPR** | Shell estático + agujeros dinámicos en la misma ruta | La mayoría de páginas reales con mezcla estático/dinámico | Requiere pensar bien dónde van los boundaries | Comportamiento por defecto con `cacheComponents: true` |

#### SSR — Renderizado dinámico por request

Cualquier componente que acceda a datos de la request es dinámico. En v16 debes envolverlo en `<Suspense>` para que el resto de la página siga siendo shell estático:

```tsx
// app/products/UserBanner.tsx  (Server Component, dinámico)
import { cookies } from 'next/headers'

export async function UserBanner() {
  const session = (await cookies()).get('session')?.value // ← dato por request
  if (!session) return <div>Bienvenido, invitado. <a href="/login">Entrar</a></div>
  return <div>¡Hola de nuevo! <a href="/account">Tu cuenta</a></div>
}
```

```tsx
// app/products/page.tsx
import { Suspense } from 'react'
export default function Page() {
  return (
    <>
      <ProductsListing />                {/* estático / cacheado → va al shell */}
      <Suspense fallback={<BannerSkeleton />}>
        <UserBanner />                   {/* dinámico → streaming */}
      </Suspense>
    </>
  )
}
```

**Por qué:** sin el `<Suspense>`, leer `cookies()` en cualquier parte del árbol forzaría a que **toda la ruta** sea dinámica (perderías el prerender del CDN). El boundary aísla lo dinámico. De hecho, en v16 si accedes a datos no cacheados/dinámicos fuera de un `<Suspense>` o `use cache`, obtienes el error `Uncached data was accessed outside of <Suspense>` en dev y build.

#### SSG e ISR — con `use cache` + `cacheLife`

```tsx
// SSG "puro": no cambia hasta el próximo deploy
export async function getSettings() {
  'use cache'
  cacheLife('max')          // revalidate ≈ 1 mes, expire = Infinity
  return await fetchSettings()
}

// ISR: revalidación en background
async function BlogPosts() {
  'use cache'
  cacheLife('hours')        // stale 5 min, revalidate 1 h, expire 1 día
  cacheTag('posts')         // permite invalidación on-demand por tag
  const posts = await (await fetch('https://api.vercel.app/blog')).json()
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
}
```

#### PPR — Partial Prerendering (la pieza central de v16)

PPR resuelve el falso dilema histórico "o estático o dinámico". Con `cacheComponents: true` cada ruta se compila en **dos artefactos**: un shell HTML estático (con los fallbacks de Suspense en los huecos) y un `postponedState` serializado que marca dónde se pausó el render. En runtime, el CDN sirve el shell al instante (TTFB ≈ latencia de edge) y el servidor reanuda el render de sólo los agujeros dinámicos, haciéndoles streaming en la misma respuesta HTTP.

Regla de oro para PPR:
- **Shell estático** ← contenido `use cache`, operaciones deterministas, y fallbacks de `<Suspense>`.
- **Agujero dinámico** ← componentes que leen `cookies()`/`headers()`/`searchParams`, datos frescos, o cachés de vida muy corta.

**Casos donde PPR brilla:** páginas de producto (imágenes/descripción estáticas + carrito/inventario dinámicos), listados con filtros por URL, homepage con hero de CMS + banner personalizado. **Casos donde NO conviene:** dashboards 100% personalizados (si menos del 30% es estático, el coste de partir no vale la pena → usa render dinámico de punta a punta); páginas donde no puedes hacer un skeleton fiable (empeorarías el CLS).

> **Trampa real documentada por practicantes:** un Client Component envuelto en `<Suspense>` NO se convierte en un agujero PPR server-side; PPR sólo aplica cuando el componente dentro del Suspense es un Server Component que usa datos dinámicos. Y si algún layout padre tiene un `force-dynamic` heredado, PPR se desactiva silenciosamente en ese subárbol.

#### Streaming con `loading.tsx` y `<Suspense>`

`loading.tsx` en una carpeta de ruta crea automáticamente un boundary de Suspense alrededor de la página, mostrando un estado de carga instantáneo mientras se resuelve. `<Suspense>` manual da control fino a nivel de componente.

**Impacto en Web Vitals (por qué el streaming se siente rápido):** sin streaming, el TTFB equivale a la query más lenta. Con streaming, el servidor manda el shell en cuanto está listo, así que el TTFB cae al tiempo de renderizar layouts y fallbacks, y el FCP se desacopla del fetch de datos. **Advertencia crítica de LCP:** si tu elemento LCP (hero, encabezado principal) está *dentro* de un boundary de Suspense, no puede pintarse hasta que ese boundary resuelva. Mantén el elemento LCP **fuera/encima** de los boundaries. Además, una vez que empieza el streaming ya se enviaron los headers y el status 200; un `notFound()` a mitad de stream no puede cambiar el status a 404 (Next.js inyecta `<meta name="robots" content="noindex">` en su lugar).

**Granularidad de los Suspense boundaries:** uno por "sección independiente" que tenga su propia latencia. En un dashboard, envuelve cada widget en su propio `<Suspense>` para que se hidraten por separado (mejora INP) y cada uno haga streaming en cuanto sus datos estén listos.

---

### 3. Next.js 16: features específicas y cambios de versión

#### `use cache` (directiva)
Marca una ruta, componente o función async como cacheable. Requiere `cacheComponents: true` en `next.config.ts`. Tres niveles:

```tsx
// Nivel archivo: todas las exportaciones (deben ser funciones async)
'use cache'
export default async function Page() { /* ... */ }

// Nivel componente
export async function BlogPosts() {
  'use cache'
  return <>{/* ... */}</>
}

// Nivel función (dato)
export async function getData() {
  'use cache'
  const data = await fetch('/api/data')
  return data
}
```

**Valores por defecto (si no llamas a `cacheLife`):** perfil `default` = 5 minutos de stale (cliente), 15 minutos de revalidate (servidor), y **nunca expira por tiempo**.

**Cómo genera la clave de caché:** un hash de (Build ID + ID de la función + argumentos serializables + closures capturados). Por eso distintos argumentos producen entradas separadas (habilita caché parametrizado/personalizado).

**Restricciones importantes:**
- **No puedes llamar `cookies()`/`headers()`/`searchParams` dentro de un scope `use cache`.** El patrón correcto es leerlos *fuera* y pasar el valor como argumento (que se vuelve parte de la clave).
- Argumentos y valores de retorno deben ser serializables (primitivos, objetos planos, arrays, Dates, Maps, Sets; JSX sólo como retorno o como "pass-through"). No: instancias de clase, funciones, símbolos, URL.
- Patrón "interleaving": puedes pasar `children` o Server Actions como slots a un componente `use cache` sin afectar su entrada de caché, siempre que no los introspecciones dentro.
- Por defecto usa caché **in-memory (LRU)**. En serverless no persiste entre requests; para caché compartida entre réplicas usa `'use cache: remote'` (con handler tipo Redis/KV). Para datos por usuario que no puedes refactorizar, existe `'use cache: private'`.
- Si el build "cuelga" ~50s, casi siempre es porque pasaste una Promise de datos dinámicos a un scope `use cache`.

#### `cacheComponents` (config)
```ts
// next.config.ts
import type { NextConfig } from 'next'
const nextConfig: NextConfig = { cacheComponents: true }
export default nextConfig
```
Activa el modelo Cache Components (unifica los antiguos `ppr`, `useCache` y `dynamicIO`). Con él, los GET Route Handlers siguen el mismo modelo de prerender que las páginas, y Next.js usa el componente `<Activity>` de React para preservar el estado de UI al navegar (al volver atrás, la ruta anterior reaparece con su estado intacto). **Nota de versión:** en 16.0.x era `experimental.cacheComponents`; desde 16.1.x es una opción de nivel superior `cacheComponents: true`.

#### `cacheLife` — perfiles de duración
Tres tiempos, todos en segundos: **`stale`** (cuánto puede el cliente usar la copia sin revalidar), **`revalidate`** (cada cuánto regenera el servidor en background), **`expire`** (edad máxima dura; luego bloquea hasta tener contenido fresco). Perfiles integrados con sus **valores exactos** (según el PR #71322 de vercel/next.js, "Add built-in set of cacheLife profiles", de Sebastian Markbåge):

| Perfil | stale | revalidate | expire |
|---|---|---|---|
| `seconds` | 30 s | 1 s | 1 min |
| `minutes` | 5 min | 1 min | 1 h |
| `hours` | 5 min | 1 h | 1 día |
| `days` | 5 min | 1 día | 1 semana |
| `weeks` | 5 min | 1 semana | 1 mes |
| `max` | 5 min | 1 mes (60·60·24·30 s) | Infinito |

Perfiles custom en `next.config.ts`:
```ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    blog: { stale: 3600, revalidate: 900, expire: 86400 },
  },
}
```
> **Dato clave:** un caché "de vida corta" (perfil `seconds`, `revalidate: 0`, o `expire` < 5 min) se **excluye automáticamente del prerender y se vuelve un agujero dinámico**. Así puedes mezclar estático y dinámico en la misma página.

#### `cacheTag` + invalidación
```tsx
async function getProducts() {
  'use cache'
  cacheTag('products')
  return db.query('SELECT * FROM products')
}
```

Tres primitivas de invalidación (la elección correcta importa mucho). El blog oficial de Next.js 16 lo dejó explícito: *"revalidateTag() now requires a cacheLife profile as the second argument to enable stale-while-revalidate (SWR) behavior… we recommend 'max' for most cases: `revalidateTag('blog-posts', 'max')`"*:

| Función | Dónde | Semántica | Cuándo usarla |
|---|---|---|---|
| `revalidateTag(tag, 'max')` | Server Action o Route Handler | Marca stale; se refresca en la próxima visita (stale-while-revalidate) | Webhooks, cron, consistencia eventual (blog, catálogo). El 2º argumento (perfil) es **obligatorio** en v16; la forma de un solo argumento está deprecada |
| `updateTag('tag')` | Sólo Server Actions | Expira inmediatamente; read-your-writes | El usuario debe ver su cambio al instante (editar perfil, publicar post) |
| `revalidatePath('/blog')` | Server Action o Route Handler | Invalida un path concreto | Cuando no sabes qué tags tocar; prefiere tags cuando puedas (más preciso) |
| `refresh()` | Sólo Server Actions | Refresca datos NO cacheados del router; no toca tags | Contadores de notificaciones, métricas en vivo tras una acción |

#### APIs de request asíncronas (breaking change)
```tsx
// ❌ Next.js 15
export default function Page({ params, searchParams }) {
  const { id } = params
  const cookieStore = cookies()
}
// ✅ Next.js 16
export default async function Page({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sort: string }>
}) {
  const { id } = await params
  const { sort } = await searchParams
  const cookieStore = await cookies()
}
```
El codemod `npx @next/codemod@canary upgrade latest` migra ~80% de los casos. `npx next typegen` genera helpers de tipos (`PageProps<'/blog/[slug]'>`, `LayoutProps`, `RouteContext`).

#### Otros cambios de v15 → v16 a tener en cuenta
- **Turbopack por defecto** en dev y build.
- **`middleware.ts` → `proxy.ts`** (mismo código, pero corre en Node.js). `middleware.ts` sigue funcionando para Edge pero está deprecado.
- **Cache Components requiere runtime Node.js** (no compatible con `export const runtime = 'edge'` en esas rutas).
- **Node.js 20.9+** obligatorio (18 ya no soportado); TypeScript 5.1+.
- **Eliminados:** AMP, `next lint` (usa ESLint/Biome directo), `serverRuntimeConfig`/`publicRuntimeConfig` (usa `.env`).
- **`next/image`:** cambios confirmados contra la doc oficial (`nextjs.org/docs/app/api-reference/components/image`, todos en v16.0.0):
  - El prop `priority` quedó **deprecado en favor de `preload`**. Verbatim: *"Starting with Next.js 16, the `priority` property has been deprecated in favor of the `preload` property in order to make the behavior clear."* (En la mayoría de casos, la propia doc recomienda `loading="eager"` o `fetchPriority="high"` antes que `preload`.)
  - El **`minimumCacheTTL` por defecto pasó de 60 segundos a 4 horas (14400 s)**. Verbatim de la guía de upgrade: *"The default value for `images.minimumCacheTTL` has changed from 60 seconds to 4 hours (14400 seconds). This reduces revalidation cost for images without cache-control headers."*
  - **Seguridad de imágenes endurecida:** *"A new security restriction blocks local IP optimization by default. Set `images.dangerouslyAllowLocalIP` to `true` only for private networks."*; los orígenes locales con query string requieren `images.localPatterns.search`; el default de `images.qualities` pasó a `[75]` (allowlist obligatoria); `images.maximumRedirects` pasó de ilimitado a 3; `images.domains` está deprecado en favor de `images.remotePatterns`.
  - Formato por defecto: **WebP** (`formats: ['image/webp']`); AVIF sigue siendo opt-in (`['image/avif', 'image/webp']`). Esto **no cambió** en v16.
- **Routing más eficiente:** deduplicación de layouts al prefetch y prefetch incremental (sólo trae lo que no está en caché).
- React 19.2 integrado (View Transitions, `useEffectEvent`, `<Activity>`).

---

### 4. Server Actions

Son funciones de servidor marcadas con `'use server'`, invocables desde `<form action={...}>` u onClick sin escribir un endpoint HTTP. Ideales para **mutaciones** disparadas desde tu propia UI.

```tsx
// app/actions.ts
'use server'
import { updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({ title: z.string().min(1) })

export async function createPost(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('No autorizado')      // ← autz siempre

  const { title } = schema.parse({ title: formData.get('title') }) // ← validación
  const post = await db.post.create({ data: { title } })
  updateTag('posts')          // read-your-writes: el usuario ve su cambio ya
  redirect(`/posts/${post.id}`)
}
```

```tsx
// Uso con progressive enhancement: el form funciona sin JS
export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <button type="submit">Publicar</button>
    </form>
  )
}
```

**Cuándo Server Action vs Route Handler (regla simple):** *si lo dispara un humano desde tu UI → Server Action; si lo dispara una máquina (webhook, app móvil, API pública) → Route Handler.* Los Server Actions eliminan boilerplate de `fetch('/api/...')` y los `router.refresh()` manuales. Seguridad: usan POST, corren en servidor (los secretos no se exponen), y Next.js 16 cifra las variables de closure en tránsito — pero **debes validar toda entrada (Zod) y verificar auth/authz igual que en un endpoint**. Devuelve errores como parte del objeto de respuesta y muéstralos con `useActionState`. Los Server Actions son para mutar, no para leer datos (usa Server Components o Route Handlers para leer).

---

### 5. Route Handlers (API Routes del App Router)

Archivos `route.ts` con funciones `GET`/`POST`/etc. usando Web Request/Response. Son el equivalente a las viejas API Routes.

**Cuándo usar cada cosa:**
- **Server Component** → leer datos para renderizar en el servidor (lo más común; no necesitas un endpoint).
- **Route Handler** → exponer HTTP a consumidores externos (webhooks, apps móviles, APIs públicas), o cuando necesitas caché GET explícita, o data fetching desde un Client Component sin exponer secretos.
- **Server Action** → mutaciones desde tu propia UI.

**Con Cache Components:** los GET Route Handlers siguen el mismo modelo de prerender que las páginas: dinámicos por defecto, prerenderizables si no tocan datos dinámicos, y cacheables con `use cache` (pero `use cache` no va directo en el body del handler — extráelo a una función helper):

```ts
// app/api/products/route.ts
import { cacheLife } from 'next/cache'

async function getProducts() {
  'use cache'
  cacheLife('hours')
  return await db.query('SELECT * FROM products')
}

export async function GET() {
  return Response.json(await getProducts())
}
```

**Runtime edge vs node:** Node.js es el default y es lo que Cache Components requiere. Edge (`export const runtime = 'edge'`) da menor latencia geográfica pero tiene APIs limitadas y no soporta Cache Components. **Constraints de serverless a recordar:** no hay WebSockets fiables, no hay estado compartido entre requests, la escritura al FS puede fallar, y operaciones largas pueden ser terminadas por límites de tiempo.

---

### 6. Optimizaciones más allá del React Compiler y `memo`

#### 6.1 Las capas de caché de Next.js
- **`use cache` / `unstable_cache`** → caché de datos/UI en servidor (reemplaza el fetch cache implícito).
- **Router Cache (cliente)** → guarda payloads RSC de páginas/layouts para navegación instantánea. Mínimo 30s de stale forzado en el cliente.
- **Full Route Cache / shell PPR** → el HTML estático servido desde CDN.
- En el modelo v16, `fetch` **ya no se cachea por defecto** (en v14 sí). Si quieres cachear un `fetch`, envuélvelo en una función `use cache` o usa `{ cache: 'force-cache' }` en el modelo previo.

#### 6.2 Data fetching: evitar waterfalls
Un waterfall ocurre cuando fetches independientes se ejecutan en secuencia. Soluciones:

```tsx
// ✅ Paralelizar con Promise.all (en Server Component)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [user, posts, stats] = await Promise.all([
    getUser(id), getPosts(id), getStats(id),   // arrancan a la vez
  ])
  // ...
}
```

```tsx
// ✅ Deduplicar con React.cache() cuando NO usas fetch (ORM/DB directo)
import { cache } from 'react'
import 'server-only'
export const getItem = cache(async (id: string) => db.item.findUnique({ where: { id } }))
export const preload = (id: string) => { void getItem(id) } // patrón preload

// Llama preload(id) *antes* del trabajo bloqueante para que los datos ya estén listos
```

Regla: fetches independientes → `Promise.all`; datos repetidos en varios componentes → `React.cache()` (o `use cache`); combínalos (cachea lo caro, paraleliza el resto). Para no bloquear todo, mete cada sección lenta en su propio `<Suspense>`.

#### 6.3 Code splitting / lazy loading
```tsx
'use client'
import dynamic from 'next/dynamic'
// Componente pesado (charts, mapas) sólo cuando se necesita
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <div className="h-64 animate-pulse bg-gray-100" />,
  ssr: false, // client-only (útil si usa APIs de browser). NO permitido en Server Components
})
```
Regla práctica: cualquier componente >50KB que no esté above-the-fold debería ser `dynamic`. `next/dynamic` es `React.lazy` + `Suspense` con ergonomía extra (loading, named exports, `ssr:false`). Analiza el bundle con `ANALYZE=true npm run build` (o el nuevo Bundle Analyzer experimental de 16.1) para detectar dependencias grandes o código de servidor filtrándose al cliente.

#### 6.4 Imágenes (`next/image`)
```tsx
import Image from 'next/image'
// LCP hero: usa preload (priority está deprecado en v16)
<Image src="/hero.jpg" alt="Hero" width={1600} height={900} preload sizes="100vw" />
// Below-the-fold: lazy por defecto, con sizes correcto
<Image src={p.img} alt={p.name} width={400} height={300}
       sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw" />
```
Da siempre `width`/`height` (o `fill` + contenedor dimensionado) para evitar CLS. `sizes` es crítico: sin él el navegador puede bajar una imagen mucho más grande de lo necesario. `next/image` da WebP (AVIF opt-in), srcset responsivo y lazy loading automáticos.

#### 6.5 Fuentes (`next/font`)
```tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap' })
```
Auto-hospeda la fuente (elimina el request externo y el DNS lookup) y previene layout shift. Uno de los wins más fáciles de Core Web Vitals.

#### 6.6 Scripts de terceros (`next/script`)
```tsx
import Script from 'next/script'
<Script src="https://analytics.example.com/s.js" strategy="lazyOnload" />
```
Estrategias: `afterInteractive` (default, tras hidratar), `lazyOnload` (en idle, para no críticos como analytics/chat), `beforeInteractive` (raro, bloquea). Coloca los scripts en el scope de layout más pequeño posible, no globalmente.

#### 6.7 Prefetching de `<Link>`
Rutas estáticas se prefetchean por defecto (TTL cliente ~5 min). Rutas dinámicas no se prefetchean del todo salvo que tengan `loading.tsx` (entonces se prefetchea hasta el primer boundary, TTL ~30s). El scheduler de v16 prioriza links en viewport, luego hover/touch, cancela los que salen de viewport, y deduplica layouts compartidos.

#### 6.8 Cómo cada estrategia afecta los Core Web Vitals
- **LCP** (bueno: <2.5s): estático/ISR desde CDN → excelente (<1s típico). SSR dinámico → peor (HTML por request). Mantén el elemento LCP en el shell, fuera de Suspense, y usa `preload` en la imagen LCP.
- **INP** (bueno: <200ms): menos JS de cliente = mejor. Server Components no hidratan; minimiza Client Components. Divide widgets en Suspense boundaries separados para hidratación granular.
- **CLS** (bueno: <0.1): reserva espacio con `width`/`height` en imágenes y skeletons que igualen el tamaño del contenido; `display: swap` en fuentes.
- **TTFB:** streaming lo reduce (mandas el shell sin esperar los datos). Si TTFB > ~800ms, LCP no llega a 2.5s → arregla el servidor/render antes de tocar el cliente.
- **Medición:** `useReportWebVitals` (hook de `next/web-vitals`) + RUM; recuerda que INP y CLS reales sólo se miden con usuarios reales (Lighthouse no interactúa, usa TBT como proxy).

---

## Recommendations

**Fase 0 — Preparación del upgrade a v16 (si vienes de 15):**
1. Sube a Node.js 20.9+ y TypeScript 5.1+.
2. Corre el codemod `npx @next/codemod@canary upgrade latest` y luego `npx next typegen`.
3. Busca manualmente accesos síncronos a `params`/`searchParams`/`cookies()`/`headers()` que el codemod se haya saltado. Deja el build en verde antes de testear.
4. Renombra `middleware.ts` → `proxy.ts` (verifica que la lógica funcione en Node.js si usabas Edge).
5. Reemplaza `priority` por `preload` en tu imagen LCP; revisa config de imágenes (`remotePatterns`, `localPatterns`, `qualities`).

**Fase 1 — Adopción de Cache Components (incremental, no de golpe):**
1. Activa `cacheComponents: true`. **Todo pasará a dinámico**; el rendimiento puede caer hasta que añadas `use cache` donde corresponde. Deja que los errores de "uncached data outside Suspense" te guíen.
2. Elimina configs de segmento viejas (`dynamic`, `revalidate`, `fetchCache`, `experimental_ppr`).
3. Para datos estables: añade `use cache` + `cacheLife` lo más cerca del acceso a datos posible, con `cacheTag` para invalidación precisa.
4. Para datos por request (cookies/headers): envuélvelos en `<Suspense>` con un skeleton que reserve espacio.
5. Testea SIEMPRE en `next build && next start` (el caché se comporta distinto en dev).

**Fase 2 — Optimización micro (por componente/ruta):**
1. Aplica el árbol de decisión Server/Client a cada componente; empuja `'use client'` a las hojas.
2. Identifica el elemento LCP de cada ruta y sácalo de cualquier Suspense; ponle `preload`.
3. Paraleliza fetches independientes; deduplica con `React.cache()`; `dynamic()` para todo componente pesado >50KB no crítico.
4. Añade `cacheTag` a cada función cacheada para poder invalidar con precisión desde Server Actions (`updateTag`) o webhooks (`revalidateTag(tag,'max')`).

**Umbrales que cambian la decisión:**
- Si una ruta es **>70% personalizada por usuario** → no uses PPR; render dinámico end-to-end.
- Si no puedes hacer un **skeleton fiable** → no metas esa sección en Suspense (empeorarías CLS); considera cachearla.
- Si el **TTFB > 800ms** → arregla servidor/DB/render antes de optimizar el cliente.
- Si corres **múltiples réplicas self-hosted** → `use cache` in-memory no se comparte; usa `use cache: remote` con Redis/KV.
- Si necesitas **edge por latencia** → sácalo de Cache Components (esas rutas exigen Node.js); pon la lógica edge en `proxy.ts` o funciones edge externas.

---

## Caveats

- **Ritmo de cambio.** Next.js 16 salió el 21 de octubre de 2025 (confirmado en el blog oficial de Vercel y marcado como versión LTS) y las minors (16.1, 16.2, 16.3) han movido detalles rápidamente (p.ej. `cacheComponents` pasó de `experimental` a top-level entre 16.0 y 16.1; `revalidateTag` cambió su firma). Verifica siempre contra la doc oficial (`nextjs.org/docs`, añade `.md` a cualquier URL para verla en markdown) y fíjate en la versión exacta.
- **Experimental vs estable.** PPR, `use cache`, `cacheLife`, `cacheTag`, Turbopack y React Compiler son estables en v16. Pero `use cache: remote`/`private`, el Bundle Analyzer, `next/root-params` y la persistencia de caché de build siguen en fases experimentales/en desarrollo — no los trates como definitivos.
- **Comportamiento serverless del caché.** La caché in-memory de `use cache` puede NO persistir entre requests en serverless; no asumas hits de caché sin un handler remoto.
- **Fuentes secundarias en cifras de rendimiento.** El "5-10x faster Fast Refresh / 2-5x faster builds" viene del post oficial de Next.js 16. El "~87% más rápido el dev server" es específico de **16.2 frente a 16.1** (benchmark de Roboto Studio: *"Next.js 16.2 starts your dev server roughly 87% faster than 16.1, or about a 4x speed ratio"*), y el "25-60% faster HTML render" que a veces se cita en paralelo Vercel lo atribuye a un cambio de deserialización de RSC en el core de React. El "TTFB −60% con PPR" proviene de blogs de practicantes; son indicativos, no garantías — mide en tu propio proyecto.
- **Este documento asume App Router.** Nada de Cache Components/PPR/`use cache` aplica al Pages Router (que sigue soportado sin cambios).
- Los valores de perfiles `cacheLife` de la tabla provienen del PR #71322 de vercel/next.js; confirma que sigan vigentes en la referencia de `cacheLife` de tu versión concreta.

---

## Apéndice Quipu: matriz de lazy loading

En Quipu, `next/dynamic(..., { ssr: false })` aplica a UI pesada o browser-only que no compite con el LCP: sheets/dialogs bajo interacción (`MovementDetailSheet`, flujos Espacios), Turnstile (script Cloudflare) y passkeys/WebAuthn en auth. Las páginas autenticadas delegan loading a skeletons internos del Client Component (`useQuery`); no envolver esas vistas en `<Suspense>` en `page.tsx` salvo boundary real (Server Component async). Detalle en `docs/QUIPU-MASTER.md` §4.6.