# Quipu App — Memory

## Project
Personal finance SaaS app for the Peruvian market. Envelope budgeting (pre-allocation).
Stack: Next.js 16 App Router + Convex + Better Auth + Polar.sh + Sentry.
Package manager: **bun** (always, never npm/pnpm).

## Convex Auth Pattern
- `ctx.auth.getUserIdentity()` → `identity.subject` = Better Auth user._id
- `identity.subject` maps to `profiles.userId` (v.string(), NOT v.id())
- Auth helpers in `convex/helpers.ts`: `getProfileOrThrow`, `requirePremium`
- Premium check: `if (profile.plan !== "premium") throw new ConvexError(...)`

## Convex Files Created
- `convex/helpers.ts` — auth utilities
- `convex/profiles.ts` — profile CRUD + onboarding
- `convex/expenses.ts` — expenses with pagination + free plan limit (20/month)
- `convex/fixedCommitments.ts` — fixed commitments (premium only)
- `convex/savings.ts` — savings sub-envelopes + goals (free: 1 goal, premium: unlimited)
- `convex/specialIncomes.ts` — gratificaciones/CTS (premium)
- `convex/payday.ts` — `getDashboardData` (aggregate query), `getRescueStatus`, `processPayday`
- `convex/streaks.ts` — streaks + achievements (internal mutation scheduled at end-of-month)
- `convex/coach.ts` — coach messages (free: 1/week, premium: daily)
- `convex/subscriptions.ts` — Polar plan management (internal mutations)
- `convex/http.ts` — Better Auth routes + Polar webhook at `/webhooks/polar`

## Domain Key Rules
- Savings ACCUMULATE across months; needs/wants RESET monthly
- Fixed commitments are deducted from income BEFORE calculating envelope percentages
- Rescue Mode trigger: spentNeeds > allocatedNeeds OR spentWants > allocatedWants
- Month compliance: spentNeeds ≤ allocatedNeeds AND spentWants ≤ allocatedWants
- Polar webhook metadata must include `userId` (Better Auth user._id) to link subscription

## shadcn/ui
- Components go to `@/core/components/ui` (non-default alias in components.json)
- Add with: `npx shadcn add <component>`
- Style: new-york, neutral base, Lucide icons

## Polar Webhook Flow
subscription.created → `linkPolarCustomer` (sets polarCustomerId + activates premium)
subscription.revoked → `revokePremium` (sets plan: "free")
