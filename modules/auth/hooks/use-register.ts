import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
  type RegisterSchema,
} from "@/modules/auth/schemas/register.schema";
import { authClient } from "@/lib/auth-client";

export const useRegister = () => {
  const form = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
    },
  });

  const handleSubmit = async (data: RegisterSchema) => {
    console.log({ data });
    await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.fullName,
    });
  };

  return {
    form,
    handleSubmit,
  };
};
