import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const AUTH_MODELS = [
  "user",
  "session",
  "account",
  "verification",
  "jwks",
  "passkey",
] as const;

// Solo para testing contra la BD de desarrollo. internalAction: jamás
// invocable desde clientes públicos; se ejecuta con `npx convex run` o dashboard.
export const resetAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ deleted: Record<string, number> }> => {
    const appResult = await ctx.runMutation(
      internal.lib.resetAppTables.resetAppTables,
    );
    const appDeleted: Record<string, number> =
      (appResult as { deleted?: Record<string, number> } | null)?.deleted ?? {};

    const authResults = await Promise.all(
      AUTH_MODELS.map(async (model) => {
        const result = await ctx.runMutation(
          components.betterAuth.adapter.deleteMany,
          {
            input: { model },
            paginationOpts: { numItems: 999999, cursor: null },
          },
        );
        return [model, Array.isArray(result) ? result.length : 0] as const;
      }),
    );
    const authCounts = Object.fromEntries(authResults) as Record<
      string,
      number
    >;

    return { deleted: { ...appDeleted, ...authCounts } };
  },
});
