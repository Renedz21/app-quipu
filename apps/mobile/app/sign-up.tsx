import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { authClient } from "@/lib/auth-client";

export default function SignUpScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/(tabs)" />;

  const signUpWithPasskey = async () => {
    setError(null);
    setLoading(true);
    // Passkey-first (Better Auth 1.6.30): el server resuelve/crea el usuario
    // con `context` (email) y registra la passkey SIN crear sesión.
    const registration = await authClient.passkey.addPasskey({
      context: email,
    });
    if (registration.error) {
      setLoading(false);
      setError(registration.error.message ?? "No se pudo crear la cuenta");
      return;
    }
    // El registro 1.6.30 no crea sesión: el sign-in con la passkey recién
    // creada la establece (segunda ceremonia, sin contraseña).
    const signIn = await authClient.signIn.passkey();
    setLoading(false);
    if (signIn.error) {
      setError(
        "Tu passkey quedó registrada. Inicia sesión con ella para continuar.",
      );
      return;
    }
    router.replace("/(tabs)");
  };

  const signUpWithEmail = async () => {
    setError(null);
    setLoading(true);
    // El server (plugin convex) requiere `name`: se deriva del email,
    // igual que el resolveUser de passkey en apps/web/convex/auth.ts.
    const name = email.split("@")[0] ?? email;
    const { error } = await authClient.signUp.email({ email, password, name });
    setLoading(false);
    if (error) {
      setError(error.message ?? "No se pudo crear la cuenta");
      return;
    }
    // requireEmailVerification está activo en el server: la verificación se
    // hace desde el email (el enlace abre la web). Sin sesión hasta verificar.
    setError("Revisa tu correo y verifica tu cuenta desde el enlace.");
  };

  return (
    <View className="flex-1 justify-center gap-6 bg-[#FBFAF7] px-6">
      <View className="gap-1">
        <Text className="font-newsreader text-[28px] text-foreground">
          Crea tu cuenta
        </Text>
        <Text className="font-hanken text-[14px] text-foreground/55">
          Tu llave de acceso (passkey) es tu método principal.
        </Text>
      </View>

      <View className="gap-3">
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          placeholder="Email"
          className="rounded-xl border border-[#E8E6DF] px-4 py-3 font-hanken text-[15px] text-foreground"
        />
        <Pressable
          onPress={() => void signUpWithPasskey()}
          disabled={loading || !email}
          className="items-center rounded-xl bg-foreground px-5 py-3.5"
        >
          {loading ? (
            <ActivityIndicator color="#FBFAF7" />
          ) : (
            <Text className="font-hanken-semibold text-[15px] text-[#FBFAF7]">
              Crear cuenta con Passkey
            </Text>
          )}
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-[#E8E6DF]" />
        <Text className="font-geist-mono text-[10.5px] text-foreground/45 uppercase">
          o con email
        </Text>
        <View className="h-px flex-1 bg-[#E8E6DF]" />
      </View>

      <View className="gap-3">
        <TextInput
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          secureTextEntry
          placeholder="Contraseña"
          className="rounded-xl border border-[#E8E6DF] px-4 py-3 font-hanken text-[15px] text-foreground"
        />
        <Pressable
          onPress={() => void signUpWithEmail()}
          disabled={loading || !email || !password}
          className="items-center rounded-xl border border-[#E8E6DF] px-5 py-3.5"
        >
          <Text className="font-hanken-semibold text-[15px] text-foreground">
            Crear cuenta con email
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text className="font-hanken text-[13px] text-foreground/70">
          {error}
        </Text>
      ) : null}

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
  );
}
