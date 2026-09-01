import { Pressable, Text } from "react-native";
import { authClient } from "@/lib/auth-client";

export default function SignOutButton() {
  return (
    <Pressable hitSlop={12} onPress={() => void authClient.signOut()}>
      <Text className="font-hanken-semibold text-[12px] text-foreground/45">
        Salir
      </Text>
    </Pressable>
  );
}
