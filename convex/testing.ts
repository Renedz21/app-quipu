import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * SOLO E2E: eleva/degrada el plan del usuario autenticado.
 *
 * Existe porque los smoke tests del rescate premium (`smoke.p0.spec.ts`) no
 * pueden pasar por el flujo real de facturación (Polar, pendiente). El guard
 * de deployment la hace inejecutable en producción: `CONVEX_DEPLOYMENT` lo
 * fija Convex y en prod siempre empieza con "prod:". Nunca quitar ese guard.
 */
export const setMyPlan = mutation({
  args: { plan: v.union(v.literal("free"), v.literal("premium")) },
  handler: async (ctx, args) => {
    if (!process.env.CONVEX_DEPLOYMENT?.startsWith("dev:")) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Solo disponible en entornos de desarrollo.",
      });
    }

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

    await ctx.db.patch(profile._id, { plan: args.plan });
    return { success: true };
  },
});
