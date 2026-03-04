# Quipu 🪢

**Tu sueldo, con disciplina.**

Quipu es una aplicación web de finanzas personales para el mercado peruano. A diferencia de los rastreadores de gastos tradicionales, Quipu actúa **antes** de que gastes: divide tu sueldo automáticamente el día que cobras, para que el ahorro nunca sea lo que sobra al final del mes.

---

## ¿Por qué Quipu?

La mayoría de apps financieras son reactivas — te muestran en qué gastaste después de que ya pasó. Quipu invierte ese orden.

Inspirado en los [quipus incas](https://es.wikipedia.org/wiki/Quipu) — el sistema de registro contable prehispánico — la app formaliza el control del dinero antes de que llegue la tentación de gastarlo.

```
Apps tradicionales  →  ¿En qué gasté este mes?
Quipu               →  ¿A dónde irá mi dinero este mes?
```

---

## Cómo funciona

**1. Configuras tu plan una sola vez**
Le dices a Quipu cuánto ganas y qué día cobras. Eso es todo.

**2. Tu dinero se asigna solo**
El día de pago, Quipu divide tu sueldo automáticamente en tres sobres:
- 🏠 **Necesidades** — 50%
- 🎉 **Gustos** — 30%
- 💰 **Ahorro** — 20%

**3. Gastas sin culpa**
Sabes exactamente cuánto tienes disponible en cada categoría en todo momento.

---

## Features

### Disponibles para todos
- Dashboard con los tres sobres y saldos en tiempo real
- Registro de gastos ultrarrápido (menos de 3 segundos con el botón flotante)
- Día de pago automático con asignación instantánea
- Fondo de emergencia, objetivos de ahorro e inversión separados
- Sistema de logros y rachas para mantener la disciplina
- Coach financiero con tips contextuales

### Premium — S/ 14/mes
- **Modo Rescate** — cuando un sobre entra en negativo, la app sugiere cómo corregirlo
- **Gratificaciones y CTS** — plan automático para los ingresos extra de julio y diciembre
- **Cuotas y deudas** — descuenta tus compromisos fijos antes de calcular el presupuesto real
- **Objetivos personalizados** — con nombre, emoji y fecha límite
- **Modo Pareja** — sobre compartido con saldo visible para ambos en tiempo real
- **Coach diario** — tips personalizados según tu situación actual
- **Reportes mensuales en PDF**

---

## Stack

- **Framework:** Next.js 15 (App Router)
- **Base de datos:** [Convex](https://convex.dev) — tiempo real y transaccional
- **Auth:** [Better Auth](https://better-auth.com)
- **Pagos:** [Polar.sh](https://polar.sh)
- **UI:** Tailwind CSS + shadcn/ui
- **Emails:** Resend
- **Errores:** Sentry
- **Deployment:** Vercel

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/quipu.git
cd quipu

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Iniciar Convex en modo desarrollo
npx convex dev

# Iniciar la app
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Polar
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# Sentry (opcional en desarrollo)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## Estructura del proyecto

```
quipu/
├── app/               # Next.js App Router
│   ├── (auth)/        # Login, Register, Onboarding
│   └── (dashboard)/   # Dashboard y módulos protegidos
├── modules/           # Lógica de negocio por feature
├── convex/            # Schema y funciones de base de datos
├── core/              # Componentes y hooks globales
└── lib/               # Instancias y utilidades
```

---

## Contribuir

Este proyecto está en desarrollo activo. Si encuentras un bug o tienes una sugerencia, abre un [issue](https://github.com/tu-usuario/quipu/issues).

---

## Licencia

MIT © 2025 Quipu — Hecho en Perú 🇵🇪
