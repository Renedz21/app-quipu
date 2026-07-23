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
import {
  sendPasswordResetEmail as deliverPasswordResetEmail,
  sendVerificationEmail as deliverVerificationEmail,
} from "./lib/email/authMail";

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
        // El profile se crea al terminar el onboarding (createProfile).
        // No auto-crear aquí: un profile vacío bloquea el redirect
        // /onboarding → /dashboard y ensucia el dominio.
        onUpdate: async () => {
          // sincroniza email u otros campos si cambian
        },
        onDelete: async (ctx, authUser) => {
          const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
            .unique();
          if (!profile) return;
          // D3: borrado en cascada de todos los datos financieros del dominio
          // (las tablas de Better Auth las borra el propio plugin).
          await ctx.runMutation(internal.profiles.deleteAllDataForProfile, {
            profileId: profile._id,
          });
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
      autoSignIn: false,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await deliverPasswordResetEmail({
          to: user.email,
          url,
          name: user.name,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await deliverVerificationEmail({
          to: user.email,
          url,
          name: user.name,
        });
      },
    },
    user: {
      // D3: habilita "Eliminar cuenta" (Ajustes). El trigger onDelete de
      // arriba hace el borrado en cascada del dominio.
      deleteUser: { enabled: true },
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
            const localPart = email.split("@")[0];
            const created = await internalAdapter.createUser({
              email,
              name: localPart.length > 0 ? localPart : email,
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
