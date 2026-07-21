# Quipu

**Tu sueldo, con disciplina.** App web de finanzas personales proactivas para el
mercado peruano. Inspirada en los quipus incas: divide el dinero **antes** de
gastarlo, no después. Responde una sola pregunta: *"¿Cuánto puedo gastar hoy sin
destruir mi mes?"*

**Stack:** Next.js 16 (App Router) · React 19 · Convex · Better Auth + passkey ·
TanStack Form + Zod · shadcn/ui sobre Base UI · Tailwind v4 · Biome.

## Documentación

👉 **`docs/QUIPU-MASTER.md`** — única fuente de verdad: qué es el producto, diseño,
arquitectura, estándares, estado del desarrollo y roadmap. Leer antes de contribuir.

## Desarrollo

```bash
pnpm install
npx convex dev   # terminal 1: backend
pnpm dev         # terminal 2: http://localhost:3000
```

Validación: `pnpm tsc --noEmit` · `pnpm lint` · `pnpm test`
