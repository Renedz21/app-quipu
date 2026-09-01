import { type Href, Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { authClient } from "@/lib/auth-client";

export default function SignInScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/(tabs)" />;

  const signInWithPasskey = async () => {
    setError(null);
    setLoading(true);
    const { error } = await authClient.signIn.passkey();
    setLoading(false);
    if (error) {
      setError(error.message ?? "No se pudo iniciar sesión");
      return;
    }
    router.replace("/(tabs)");
  };

  const signInWithEmail = async () => {
    setError(null);
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Email o contraseña incorrectos");
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <View className="flex-1 justify-center gap-6 bg-[#FBFAF7] px-6">
      <View className="gap-1">
        <Text className="font-newsreader text-[28px] text-foreground">
          Quipu
        </Text>
        <Text className="font-hanken text-[14px] text-foreground/55">
          Inicia sesión con tu passkey o tu cuenta.
        </Text>
      </View>

      <Pressable
        onPress={() => void signInWithPasskey()}
        disabled={loading}
        className="items-center rounded-xl bg-foreground px-5 py-3.5"
      >
        {loading ? (
          <ActivityIndicator color="#FBFAF7" />
        ) : (
          <Text className="font-hanken-semibold text-[15px] text-[#FBFAF7]">
            Iniciar sesión con Passkey
          </Text>
        )}
      </Pressable>

      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-[#E8E6DF]" />
        <Text className="font-geist-mono text-[10.5px] text-foreground/45 uppercase">
          o con email
        </Text>
        <View className="h-px flex-1 bg-[#E8E6DF]" />
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
          autoComplete="current-password"
          secureTextEntry
          placeholder="Contraseña"
          className="rounded-xl border border-[#E8E6DF] px-4 py-3 font-hanken text-[15px] text-foreground"
        />
        <Pressable
          onPress={() => void signInWithEmail()}
          disabled={loading || !email || !password}
          className="items-center rounded-xl border border-[#E8E6DF] px-5 py-3.5"
        >
          <Text className="font-hanken-semibold text-[15px] text-foreground">
            Iniciar sesión
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text className="font-hanken text-[13px] text-[#B4482F]">{error}</Text>
      ) : null}

      <View className="flex-row justify-center gap-1">
        <Text className="font-hanken text-[13px] text-foreground/55">
          ¿No tienes cuenta?
        </Text>
        {/* "/sign-up" se crea en Task 6; aún no existe en las rutas tipadas. */}
        <Pressable onPress={() => router.push("/sign-up" as Href)}>
          <Text className="font-hanken-semibold text-[13px] text-foreground">
            Crear cuenta
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
