import { useForm } from "@tanstack/react-form";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
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

type SignInView = "welcome" | "email";

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "El email es obligatorio")
    .pipe(z.email("Email inválido")),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export default function SignInScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [view, setView] = useState<SignInView>("welcome");

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onBlur: signInSchema,
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await authClient.signIn.email(value);
      if (error) {
        formApi.setErrorMap({
          onSubmit: {
            form: error.message ?? "Email o contraseña incorrectos",
            fields: {},
          },
        });
        return;
      }
      router.replace("/(tabs)");
    },
  });

  if (session) return <Redirect href="/(tabs)" />;

  const signInWithPasskey = async () => {
    setPasskeyLoading(true);
    const { error } = await authClient.signIn.passkey();
    setPasskeyLoading(false);
    if (error) {
      form.setErrorMap({
        onSubmit: {
          form: error.message ?? "No se pudo iniciar sesión",
          fields: {},
        },
      });
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <View className="flex-1 bg-[#FBFAF7] px-6">
        {view === "email" ? (
          <View className="h-14 flex-row items-center">
            <Pressable
              onPress={() => setView("welcome")}
              hitSlop={12}
              className="-ml-1 px-1 py-2"
            >
              <Text className="font-hanken text-[24px] leading-7 text-foreground">
                ‹
              </Text>
            </Pressable>
          </View>
        ) : null}

        {view === "welcome" ? (
          <View className="flex-1 justify-center gap-6 pb-14">
            <View className="gap-1">
              <Text className="font-newsreader text-[28px] text-foreground">
                Divide tu dinero antes de gastarlo.
              </Text>
              <Text className="font-hanken text-[14px] text-foreground/55">
                Entra con la seguridad de tu propio teléfono. Sin contraseñas
                que recordar.
              </Text>
            </View>

            <Pressable
              onPress={() => void signInWithPasskey()}
              disabled={passkeyLoading}
              className="items-center rounded-xl bg-foreground px-5 py-3.5"
            >
              {passkeyLoading ? (
                <ActivityIndicator color="#FBFAF7" />
              ) : (
                <Text className="font-hanken-semibold text-[15px] text-[#FBFAF7]">
                  Continuar con Passkey
                </Text>
              )}
            </Pressable>

            <Text className="text-center font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase">
              Face ID · Touch ID · Código del teléfono
            </Text>

            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-[#E8E6DF]" />
              <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase">
                O bien
              </Text>
              <View className="h-px flex-1 bg-[#E8E6DF]" />
            </View>

            <Pressable
              onPress={() => setView("email")}
              className="items-center rounded-xl border border-[#E8E6DF] px-5 py-3.5"
            >
              <Text className="font-hanken-semibold text-[15px] text-foreground">
                Entrar con correo
              </Text>
            </Pressable>

            <View className="flex-row justify-center gap-1">
              <Text className="font-hanken text-[13px] text-foreground/55">
                ¿Nuevo en Quipu?
              </Text>
              <Pressable onPress={() => router.push("/create-account")}>
                <Text className="font-hanken-semibold text-[13px] text-foreground">
                  Crear cuenta
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {view === "email" ? (
          <View className="flex-1 justify-center gap-6 pb-14">
            <View className="gap-1">
              <Text className="font-newsreader text-[28px] text-foreground">
                Entra a tu cuenta.
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
                      autoComplete="current-password"
                      secureTextEntry
                      placeholder="Contraseña"
                      className="rounded-xl border border-[#E8E6DF] px-4 py-3 font-hanken text-[15px] text-foreground"
                    />
                    <FieldError field={field} />
                  </View>
                )}
              </form.Field>

              <form.Subscribe
                selector={(state) =>
                  [state.canSubmit, state.isSubmitting] as const
                }
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
                        Iniciar sesión
                      </Text>
                    )}
                  </Pressable>
                )}
              </form.Subscribe>
            </View>

            <View className="flex-row justify-center gap-1">
              <Text className="font-hanken text-[13px] text-foreground/55">
                ¿No tienes cuenta?
              </Text>
              <Pressable onPress={() => router.push("/create-account")}>
                <Text className="font-hanken-semibold text-[13px] text-foreground">
                  Crear cuenta
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
          {(onSubmitError) => {
            // El errorMap.onSubmit puede ser un Record de issues por campo
            // (validación de schema) o el GlobalFormValidationError que
            // seteamos en onSubmit; solo el segundo lleva mensaje global.
            const formError = onSubmitError as { form?: string } | undefined;
            const message = formError?.form;
            return message ? (
              <Text className="pb-4 text-center font-hanken text-[13px] text-[#B4482F]">
                {message}
              </Text>
            ) : null;
          }}
        </form.Subscribe>
      </View>
    </KeyboardAvoidingView>
  );
}
