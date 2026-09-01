import type { ReactElement } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "solid" | "outline";
  disabled?: boolean;
};

export default function AuthButton({
  label,
  onPress,
  loading = false,
  variant = "solid",
  disabled = false,
}: AuthButtonProps): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={
        variant === "solid"
          ? "items-center rounded-xl bg-foreground px-5 py-3.5"
          : "items-center rounded-xl border border-[#E8E6DF] px-5 py-3.5"
      }
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "solid" ? "#FBFAF7" : "#1A1A1A"}
        />
      ) : (
        <Text
          className={
            variant === "solid"
              ? "font-hanken-semibold text-[15px] text-[#FBFAF7]"
              : "font-hanken-semibold text-[15px] text-foreground"
          }
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
