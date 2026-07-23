import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * Gate premium (Fase 0 — entitlements).
 *
 * Toda query/mutation que entregue valor exclusivo de Quipu Plus empieza
 * aquí: resuelve el perfil del usuario autenticado y exige plan premium.
 * El cliente discrimina por `error.code === "PLAN_REQUIRED"` para mostrar
 * el paywall (`shared/components/premium-lock-card.tsx`), nunca compara
 * mensajes.
 *
 * Funciona también desde mutations (`MutationCtx` es compatible con
 * `QueryCtx` para lectura).
 */
export async function requirePremiumProfile(
  ctx: QueryCtx,
): Promise<Doc<"profiles">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Debes iniciar sesión.",
    });
  }

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
    .unique();
  if (!profile) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Perfil no encontrado.",
    });
  }

  if (profile.plan !== "premium") {
    throw new ConvexError({
      code: "PLAN_REQUIRED",
      message: "Esta función es parte de Quipu Plus.",
    });
  }

  return profile;
}
