import { useState } from "react";
import { Text, TextInput, View } from "react-native";

type AmountInputProps = {
  label?: string;
  valueCents: number | null;
  onChangeCents: (cents: number | null) => void;
};

function formatDisplay(digits: string): string {
  if (!digits) return "";
  return Number(digits).toLocaleString("es-PE");
}

export function AmountInput({
  label,
  valueCents,
  onChangeCents,
}: AmountInputProps) {
  const [digits, setDigits] = useState(
    valueCents != null ? String(Math.floor(valueCents / 100)) : "",
  );

  const handleChange = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, 9);
    setDigits(next);
    onChangeCents(next ? Number(next) * 100 : null);
  };

  return (
    <View className="gap-2">
      {label ? (
        <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase">
          {label}
        </Text>
      ) : null}
      <View className="flex-row items-baseline gap-2 border-b border-line pb-2">
        <Text className="font-newsreader text-[24px] text-foreground/45">
          S/
        </Text>
        <TextInput
          testID="amount-input"
          value={formatDisplay(digits)}
          onChangeText={handleChange}
          keyboardType="number-pad"
          placeholder="0"
          className="flex-1 font-newsreader text-[40px] text-foreground"
        />
      </View>
    </View>
  );
}
