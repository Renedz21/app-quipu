# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start Next.js dev server
bun run build    # Production build
bun run lint     # Biome check (linting)
bun run format   # Biome format --write (auto-format)
npx convex dev   # Start Convex dev server (run alongside bun dev)
```

There are no tests configured yet.

## Architecture

This is a personal finance app (budget envelopes, expense tracking, savings goals, couple mode) built with **Next.js 16 App Router** + **Convex** as the backend.

### Auth: Better Auth + Convex

Auth is handled by `@convex-dev/better-auth`, which bridges Better Auth with Convex:

- **`lib/auth-client.ts`** — client-side `authClient` (used in React components)
- **`lib/auth-server.ts`** — server-side helpers: `getToken`, `isAuthenticated`, `handler` (route handler), `preloadAuthQuery`, `fetchAuth*`
- **`app/api/auth/[...all]/route.ts`** — Better Auth Next.js handler
- **`convex/betterAuth/auth.ts`** — defines `authComponent` (Convex client) and `createAuth` factory
- **`convex/http.ts`** — Convex HTTP router; registers Better Auth routes
- **`convex/auth.config.ts`** — Convex auth provider config

The root layout (`app/layout.tsx`) fetches the JWT token server-side via `getToken()` and passes it as `initialToken` to `ConvexBetterAuthProvider` to avoid hydration flicker.

### Convex Backend

- **`convex/schema.ts`** — full DB schema: `profiles`, `expenses`, `fixedCommitments`, `specialIncomes`, `savingsSubEnvelopes`, `savingsGoals`, `coachMessages`, `achievements`, `streaks`, `streakMonthlyHistory`
- **`convex/convex.config.ts`** — registers the `betterAuth` Convex component
- **`convex/helpers.ts`** — shared auth utilities: `getProfileOrThrow`, `getAuthUserIdOrThrow`, `requirePremium`
- **`convex/profiles.ts`** — `getMyProfile`, `createProfile`, `completeOnboarding`, `updateProfile`
- **`convex/expenses.ts`** — `listExpenses` (paginated), `getMonthlyTotals`, `getCurrentMonthCount`, `registerExpense`, `deleteExpense`
- **`convex/fixedCommitments.ts`** — CRUD for fixed monthly commitments (premium feature)
- **`convex/savings.ts`** — `getSavingsSubEnvelopes`, `getSavingsGoals`, `distributeSavings`, `withdrawFromEmergencyFund`, savings goal CRUD
- **`convex/specialIncomes.ts`** — `listSpecialIncomes`, `checkIfExtraordinary`, `registerSpecialIncome` (premium)
- **`convex/payday.ts`** — `getDashboardData` (aggregate query), `getRescueStatus`, `processPayday`
- **`convex/streaks.ts`** — `getStreakData`, `getAchievements`, `evaluateMonthCompliance` (internal, scheduled)
- **`convex/coach.ts`** — `getUnreadCoachMessages`, `markCoachMessageRead`, `createCoachMessage` (internal)
- **`convex/subscriptions.ts`** — `getMyPlan`, `activatePremium`, `revokePremium`, `linkPolarCustomer` (all internal except `getMyPlan`)
- **`convex/http.ts`** — Better Auth routes + Polar webhook handler (`/webhooks/polar`)
- All Convex queries/mutations use types from `convex/_generated/`

### Frontend Structure

```
app/
  (auth)/       # Login & register pages
  (dashboard)/  # Dashboard pages with sidebar layout
  api/auth/     # Better Auth route handler

core/
  components/
    ui/          # shadcn/ui components (aliased as @/core/components/ui)
    providers/   # ConvexBetterAuthProvider wrapper

modules/         # Feature modules (vertical slice pattern)
  auth/          # components/, hooks/, schemas/
  dashboard/     # Sidebar, nav items, header
  onboarding/    # Multi-step onboarding flow

lib/
  auth-client.ts
  auth-server.ts
  utils.ts       # cn() helper (clsx + tailwind-merge)

hooks/           # Shared React hooks
```

### Key Conventions

- **Package manager**: `bun` (use `bun` not `npm`/`pnpm`)
- **Linter/formatter**: Biome (not ESLint/Prettier) — 2-space indentation
- **shadcn/ui**: aliased to `@/core/components/ui` (not the default `components/ui/`). Add components with `npx shadcn add <component>`.
- **Feature modules** follow vertical slice: each module under `modules/<feature>/` contains its own `components/`, `hooks/`, `schemas/`
- **React Compiler** is enabled — avoid manual `useMemo`/`useCallback` unless strictly necessary
- **Tailwind CSS v4** with CSS variables for theming (`app/globals.css`)
- **Fonts**: DM Sans (`--font-dm-sans`) and Space Grotesk (`--font-space-grotesk`)

### Required Environment Variables

```
NEXT_PUBLIC_CONVEX_URL
NEXT_PUBLIC_CONVEX_SITE_URL
SITE_URL
BETTER_AUTH_SECRET
```
