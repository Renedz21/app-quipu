import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({
    error: "El email es válido",
  }),
  password: z.string(),
});

export type LoginSchema = z.infer<typeof loginSchema>;
