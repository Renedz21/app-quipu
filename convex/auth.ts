import { passkey } from "@better-auth/passkey";
import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { z } from "zod";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";
const rpID = process.env.PASSKEY_RP_ID || "localhost";
const rpName = process.env.PASSKEY_RP_NAME || "quipu";

const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .pipe(z.email("Email inválido"));
const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    authFunctions,
    triggers: {
      user: {
        onCreate: async (ctx, authUser) => {
          await ctx.db.insert("profiles", {
            name: "",
            country: "",
            currencyCode: "",
            currencySymbol: "",
            onboardingComplete: false,
            plan: "free",
            allocationNeeds: 50,
            allocationWants: 30,
            allocationSavings: 20,
            createdAt: Date.now(),
            userId: authUser._id,
          });
        },
        onUpdate: async () => {
          // sincroniza email u otros campos si cambian
        },
        onDelete: async (ctx, authUser) => {
          const user = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
            .unique();
          if (user) await ctx.db.delete(user._id);
        },
      },
    },
    local: {
      schema: authSchema,
    },
  },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    plugins: [
      convex({ authConfig }),
      passkey({
        rpName: rpName,
        rpID: rpID,
        origin: siteUrl,
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
        registration: {
          requireSession: false,
          resolveUser: async ({ context, ctx }) => {
            const { success, data: email } = emailSchema.safeParse(context);
            if (!success) throw new Error("Email inválido");

            const { internalAdapter } = ctx.context;
            const found = await internalAdapter.findUserByEmail(email);
            if (found?.user) {
              return {
                id: found.user.id,
                name: found.user.name,
                displayName: email,
              };
            }
            const created = await internalAdapter.createUser({
              email,
              name: email.split("@")[0]!,
              emailVerified: false,
            });
            return { id: created.id, name: created.name, displayName: email };
          },
        },
      }),
    ],
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
