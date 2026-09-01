import { useForm } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { ChevronLeft } from "reicon-react-native/icons/ChevronLeft";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import FieldError from "@/shared/components/auth/field-error";

type Step = 1 | 2 | 3 | 4;

type Account = {
  name: string;
  email: string;
  password: string;
};

const accountSchema = z.object({
  name: z.string().trim().min(1, "Dinos cómo te llamas"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "El email es obligatorio")
    .pipe(z.email("Email inválido")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Ingresa los 6 dígitos"),
});

function ProgressHeader({ label, filled }: { label: string; filled: number }) {
  return (
    <View className="gap-4">
      <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase">
        {label}
      </Text>
      <View className="flex-row gap-1.5">
        {[0, 1, 2].map((segment) => (
          <View
            key={segment}
            className="h-1 flex-1 rounded-full"
            style={{
              backgroundColor: segment < filled ? "#1A1A1A" : "#E8E6DF",
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default function CreateAccountScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [account, setAccount] = useState<Account | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendIn, setResendIn] = useState(60);
  const [passkeyDone, setPasskeyDone] = useState<boolean | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const otpRequestedForRef = useRef<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onBlur: accountSchema,
      onSubmit: accountSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.name,
      });
      if (error) {
        // Wizard idempotente: si la cuenta ya existe seguimos al paso 2;
        // el OTP prueba la propiedad del email (sin la contraseña correcta
        // no hay sesión en el paso 3).
        const haystack = [error?.code, error?.message]
          .filter(Boolean)
          .join(" ");
        if (/user[\s_]?already[\s_]?exists/i.test(haystack)) {
          setAccount(value);
          setStep(2);
          return;
        }
        formApi.setErrorMap({
          onSubmit: {
            form: error.message ?? "No se pudo crear la cuenta",
            fields: {},
          },
        });
        return;
      }
      setAccount(value);
      setStep(2);
    },
  });

  const sendOtp = useCallback(async () => {
    if (!account) return;
    setOtpLoading(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: account.email,
      type: "email-verification",
    });
    setOtpLoading(false);
    if (error) {
      setOtpError(error.message ?? "No se pudo enviar el código");
      return;
    }
    otpRequestedForRef.current = account.email;
    setResendIn(60);
  }, [account]);

  useEffect(() => {
    if (step === 2 && account && otpRequestedForRef.current !== account.email) {
      otpRequestedForRef.current = account.email;
      setResendIn(60);
      void sendOtp();
    }
  }, [step, account, sendOtp]);

  useEffect(() => {
    if (step !== 2 || resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, resendIn]);

  const verifyOtp = async () => {
    if (!account) return;
    const parsed = otpSchema.safeParse({ otp });
    if (!parsed.success) return;
    setOtpLoading(true);
    setOtpError(null);
    const { error } = await authClient.emailOtp.verifyEmail({
      email: account.email,
      otp,
    });
    if (error) {
      setOtpLoading(false);
      // TOO_MANY_ATTEMPTS llega con status 403 (FORBIDDEN) y/o code/message
      // "Too many attempts"; 429 u OTP_EXPIRED/INVALID_OTP caen en genérico.
      const tooMany =
        error.status === 429 ||
        /TOO_MANY|too many/i.test(
          [error.message, error.statusText].filter(Boolean).join(" "),
        );
      setOtpError(
        tooMany
          ? "Demasiados intentos. Pide un código nuevo."
          : "Código incorrecto o expirado",
      );
      return;
    }
    // Sesión transparente con las credenciales en memoria
    const signIn = await authClient.signIn.email({
      email: account.email,
      password: account.password,
    });
    setOtpLoading(false);
    if (signIn.error) {
      setOtpError("Correo verificado. Inicia sesión para continuar.");
      router.replace("/sign-in");
      return;
    }
    setStep(3);
  };

  const createPasskey = async () => {
    setPasskeyLoading(true);
    const { error } = await authClient.passkey.addPasskey({
      name: account?.email,
    });
    setPasskeyLoading(false);
    setPasskeyDone(!error);
    setStep(4);
  };

  const goBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
      return;
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <View className="flex-1 bg-[#FBFAF7] px-6">
        {step !== 4 ? (
          <View className="h-14 flex-row items-center">
            <Pressable
              onPress={goBack}
              hitSlop={12}
              className="-ml-1 px-1 py-2"
            >
              <ChevronLeft size={24} color="#1A1A1A" />
            </Pressable>
          </View>
        ) : null}

        {step === 1 ? (
          <View className="flex-1 justify-center gap-6 pb-14">
            <ProgressHeader label="CREAR CUENTA · 01/03" filled={1} />

            <View className="gap-1">
              <Text className="font-newsreader text-[28px] text-foreground">
                Crea tu cuenta.
              </Text>
              <Text className="font-hanken text-[14px] text-foreground/55">
                Tres pasos y entras con tu llave.
              </Text>
            </View>

            <View className="gap-3">
              <form.Field
                name="name"
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
                      autoCapitalize="words"
                      autoComplete="name"
                      placeholder="Nombre"
                      className="rounded-xl border border-[#E8E6DF] px-4 py-3 font-hanken text-[15px] text-foreground"
                    />
                    <FieldError field={field} />
                  </View>
                )}
              </form.Field>

              <form.Field
                name="email"
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
                        Continuar
                      </Text>
                    )}
                  </Pressable>
                )}
              </form.Subscribe>

              <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
                {(onSubmitError) => {
                  const formError = onSubmitError as
                    | { form?: string }
                    | undefined;
                  const message = formError?.form;
                  return message ? (
                    <Text className="font-hanken text-[13px] text-[#B4482F]">
                      {message}
                    </Text>
                  ) : null;
                }}
              </form.Subscribe>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View className="flex-1 justify-center gap-6 pb-14">
            <ProgressHeader label="CREAR CUENTA · 02/03" filled={2} />

            <View className="gap-1">
              <Text className="font-newsreader text-[28px] text-foreground">
                Confirma tu correo.
              </Text>
              <Text className="font-hanken text-[14px] text-foreground/55">
                Te enviamos un código de 6 dígitos a{" "}
                <Text className="font-hanken-semibold text-foreground">
                  {account?.email}
                </Text>
              </Text>
            </View>

            <View className="items-center">
              <View className="relative">
                <View className="flex-row gap-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <View
                      key={index}
                      className="h-14 w-12 items-center justify-center rounded-lg border"
                      style={{
                        borderColor:
                          index === otp.length && otp.length < 6
                            ? "#1A1A1A"
                            : "#E8E6DF",
                      }}
                    >
                      <Text className="font-hanken-semibold text-[22px] text-foreground">
                        {otp[index] ?? ""}
                      </Text>
                    </View>
                  ))}
                </View>
                {/* Input real invisible: opacity/position inline (RN core);
                    NO usar utilities de uniwind aquí — si la clase no se
                    aplica, el texto del input se pinta sobre las cajas. */}
                <TextInput
                  value={otp}
                  onChangeText={(value) => {
                    setOtp(value.replace(/\D/g, "").slice(0, 6));
                    setOtpError(null);
                  }}
                  keyboardType="numeric"
                  maxLength={6}
                  textAlign="center"
                  caretHidden
                  autoFocus
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0,
                  }}
                />
              </View>
            </View>

            <View className="flex-row items-center justify-center gap-2">
              <Text className="font-hanken text-[13px] text-foreground/55">
                ¿No te llegó?
              </Text>
              {resendIn > 0 ? (
                <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase">
                  Reenviar en 0:{String(resendIn).padStart(2, "0")}
                </Text>
              ) : (
                <Pressable
                  onPress={() => void sendOtp()}
                  disabled={otpLoading}
                  hitSlop={8}
                >
                  <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground uppercase">
                    Reenviar
                  </Text>
                </Pressable>
              )}
            </View>

            {otpError ? (
              <Text className="text-center font-hanken text-[13px] text-[#B4482F]">
                {otpError}
              </Text>
            ) : null}

            <Pressable
              onPress={() => void verifyOtp()}
              disabled={otp.length < 6 || otpLoading}
              className="items-center rounded-xl bg-foreground px-5 py-3.5"
            >
              {otpLoading ? (
                <ActivityIndicator color="#FBFAF7" />
              ) : (
                <Text className="font-hanken-semibold text-[15px] text-[#FBFAF7]">
                  Verificar
                </Text>
              )}
            </Pressable>

            <View className="rounded-xl bg-[#F1EFE8] px-4 py-3">
              <Text className="font-hanken text-[13px] text-foreground/55">
                También puedes abrir el enlace del correo desde este teléfono;
                Quipu continúa solo.
              </Text>
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View className="flex-1 justify-center gap-6 pb-14">
            <ProgressHeader label="CREAR CUENTA · 03/03" filled={3} />

            <View className="gap-1">
              <Text className="font-newsreader text-[28px] text-foreground">
                Tu teléfono será tu llave.
              </Text>
            </View>

            <View className="gap-3">
              {[
                "La llave nunca sale de tu teléfono",
                "Se sincroniza cifrada con tu cuenta de Apple o Google",
                "Puedes agregar otra en cualquier momento",
              ].map((line) => (
                <View key={line} className="flex-row items-start gap-3">
                  <Text className="font-hanken-semibold text-[15px] text-[#1A1A1A]">
                    ✓
                  </Text>
                  <Text className="flex-1 font-hanken text-[14px] text-foreground/70">
                    {line}
                  </Text>
                </View>
              ))}
            </View>

            <View className="gap-3">
              <Pressable
                onPress={() => void createPasskey()}
                disabled={passkeyLoading}
                className="items-center rounded-xl bg-foreground px-5 py-3.5"
              >
                {passkeyLoading ? (
                  <ActivityIndicator color="#FBFAF7" />
                ) : (
                  <Text className="font-hanken-semibold text-[15px] text-[#FBFAF7]">
                    Crear mi Passkey
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setPasskeyDone(false);
                  setStep(4);
                }}
                className="items-center rounded-xl border border-[#E8E6DF] px-5 py-3.5"
              >
                <Text className="font-hanken-semibold text-[15px] text-foreground">
                  Continuar sin Passkey
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View className="flex-1 justify-center gap-6 pb-14">
            <View className="items-center gap-4">
              <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase">
                CUENTA LISTA
              </Text>
              <View className="h-14 w-14 items-center justify-center rounded-full bg-[#E8E6DF]">
                <Text className="font-hanken-semibold text-[24px] text-[#1A1A1A]">
                  ✓
                </Text>
              </View>
            </View>

            <View className="gap-1">
              <Text className="text-center font-newsreader text-[28px] text-foreground">
                Ya puedes entrar con tu llave.
              </Text>
            </View>

            <View className="gap-3">
              {[
                {
                  label: "Passkey",
                  value: passkeyDone ? "Creada ✓" : "Pendiente",
                },
                { label: "Correo", value: "Verificado ✓" },
                { label: "Respaldo", value: "Contraseña definida ✓" },
              ].map((row) => (
                <View key={row.label} className="flex-row justify-between">
                  <Text className="font-hanken text-[14px] text-foreground/55">
                    {row.label}
                  </Text>
                  <Text className="font-hanken-semibold text-[14px] text-foreground">
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => router.replace("/(tabs)")}
              className="items-center rounded-xl bg-foreground px-5 py-3.5"
            >
              <Text className="font-hanken-semibold text-[15px] text-[#FBFAF7]">
                Configurar mi sistema
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
