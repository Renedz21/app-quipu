import { useForm } from "@tanstack/react-form";
import { Redirect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import FieldError from "@/shared/components/auth/field-error";

const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "El email es obligatorio")
    .pipe(z.email("Email inválido")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export default function SignUpScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onBlur: signUpSchema,
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      // El server exige `name` (tipo inferido del plugin convex); se deriva
      // del local-part del email, igual que `resolveUser` en el server.
      const name = value.email.split("@")[0] || value.email;
      const { error } = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name,
      });
      if (error) {
        formApi.setErrorMap({
          onSubmit: {
            form: error.message ?? "No se pudo crear la cuenta",
            fields: {},
          },
        });
        return;
      }
      // requireEmailVerification está activo en el server: la verificación se
      // hace desde el email (el enlace abre la web). Sin sesión hasta verificar.
      formApi.setErrorMap({
        onSubmit: {
          form: "Revisa tu correo y verifica tu cuenta desde el enlace.",
          fields: {},
        },
      });
    },
  });

  if (session) return <Redirect href="/(tabs)" />;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <View className="flex-1 justify-center gap-6 bg-[#FBFAF7] px-6">
        <View className="gap-1">
          <Text className="font-newsreader text-[28px] text-foreground">
            Crea tu cuenta
          </Text>
          <Text className="font-hanken text-[14px] text-foreground/55">
            Después de verificar tu cuenta, inicia sesión con tu passkey.
          </Text>
        </View>

        <View className="gap-3">
          <form.Field
            name="email"
            listeners={{
              // Tras el primer blur (o tras submit), re-ejecuta la validación
              // onBlur en cada cambio para que el mensaje no quede congelado
              // mientras el usuario corrige el valor.
              onChange: ({ fieldApi }) => {
                if (
                  fieldApi.state.meta.isBlurred ||
                  fieldApi.state.meta.errors.length > 0
                ) {
                  fieldApi.validate("blur");
                }
              },
            }}
          >
            {(field) => (
              <View className="gap-1">
                <TextInput
                  value={field.state.value}
                  onChangeText={(value) => field.handleChange(value)}
                  onBlur={field.handleBlur}
                  autoCapitalize="none"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Email"
                  className="rounded-xl border border-[#E8E6DF] px-4 py-3 font-hanken text-[15px] text-foreground"
                />
                <FieldError field={field} />
              </View>
            )}
          </form.Field>

          <form.Field
            name="password"
            listeners={{
              onChange: ({ fieldApi }) => {
                if (
                  fieldApi.state.meta.isBlurred ||
                  fieldApi.state.meta.errors.length > 0
                ) {
                  fieldApi.validate("blur");
                }
              },
            }}
          >
            {(field) => (
              <View className="gap-1">
                <TextInput
                  value={field.state.value}
                  onChangeText={(value) => field.handleChange(value)}
                  onBlur={field.handleBlur}
                  autoComplete="new-password"
                  secureTextEntry
                  placeholder="Contraseña"
                  className="rounded-xl border border-[#E8E6DF] px-4 py-3 font-hanken text-[15px] text-foreground"
                />
                <FieldError field={field} />
              </View>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          >
            {([canSubmit, isSubmitting]) => (
              <Pressable
                onPress={() => void form.handleSubmit()}
                disabled={!canSubmit || isSubmitting}
                className="items-center rounded-xl border border-[#E8E6DF] px-5 py-3.5"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#1A1A1A" />
                ) : (
                  <Text className="font-hanken-semibold text-[15px] text-foreground">
                    Crear cuenta
                  </Text>
                )}
              </Pressable>
            )}
          </form.Subscribe>
        </View>

        <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
          {(onSubmitError) => {
            // El errorMap.onSubmit puede ser un Record de issues por campo
            // (validación de schema) o el GlobalFormValidationError que
            // seteamos en onSubmit; solo el segundo lleva mensaje global.
            const formError = onSubmitError as { form?: string } | undefined;
            const message = formError?.form;
            return message ? (
              <Text className="font-hanken text-[13px] text-[#B4482F]">
                {message}
              </Text>
            ) : null;
          }}
        </form.Subscribe>

        <View className="flex-row justify-center gap-1">
          <Text className="font-hanken text-[13px] text-foreground/55">
            ¿Ya tienes cuenta?
          </Text>
          <Pressable onPress={() => router.replace("/sign-in")}>
            <Text className="font-hanken-semibold text-[13px] text-foreground">
              Iniciar sesión
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
