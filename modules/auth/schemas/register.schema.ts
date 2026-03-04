import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(1, {
    error: "El nombre completo es requerido",
  }),
  email: z.email({
    error: "El email es válido",
  }),
  password: z
    .string()
    .min(6, {
      error: "La contraseña debe tener al menos 6 caracteres",
    })
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      {
        error:
          "La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial",
      },
    ),
});

export type RegisterSchema = z.infer<typeof registerSchema>;
