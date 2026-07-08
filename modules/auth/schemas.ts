import { z } from "zod";

/**
 * Schemas Zod para validación client-side de formularios auth.
 * El server (Convex) hace su propia validación; este es solo UX.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "El correo es obligatorio")
  .pipe(z.email("Correo inválido"));

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres");

export const signInEmailSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpEmailSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, "El nombre es obligatorio").optional(),
});

export const signInPasskeySchema = z.object({
  email: emailSchema,
});

export type SignInEmailInput = z.infer<typeof signInEmailSchema>;
export type SignUpEmailInput = z.infer<typeof signUpEmailSchema>;
export type SignInPasskeyInput = z.infer<typeof signInPasskeySchema>;
