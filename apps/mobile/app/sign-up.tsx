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
          Después de verificar tu cuenta, inicia sesión con tu passkey.
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
          className="items-center rounded-xl bg-foreground px-5 py-3.5"
        >
          {loading ? (
            <ActivityIndicator color="#FBFAF7" />
          ) : (
            <Text className="font-hanken-semibold text-[15px] text-[#FBFAF7]">
              Crear cuenta
            </Text>
          )}
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
