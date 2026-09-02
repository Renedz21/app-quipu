import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { X } from "@/shared/components/ui/reicon";
import type { DraftCommitment } from "@/shared/lib/onboarding/types";

export function isCommitmentValid(commitment: DraftCommitment): boolean {
  return (
    commitment.name.trim().length > 0 &&
    commitment.amountCents > 0 &&
    commitment.dueDay >= 1 &&
    commitment.dueDay <= 31
  );
}

function formatAmount(digits: string): string {
  if (!digits) return "";
  return Number(digits).toLocaleString("es-PE");
}

type CommitmentRowProps = {
  index: number;
  commitment: DraftCommitment;
  onChange: (next: DraftCommitment) => void;
  onRemove: () => void;
};

export function CommitmentRow({
  index,
  commitment,
  onChange,
  onRemove,
}: CommitmentRowProps) {
  const [name, setName] = useState(commitment.name);
  const [amountDigits, setAmountDigits] = useState(
    commitment.amountCents > 0
      ? String(Math.floor(commitment.amountCents / 100))
      : "",
  );
  const [day, setDay] = useState(
    commitment.dueDay >= 1 ? String(commitment.dueDay) : "",
  );

  const valid = isCommitmentValid(commitment);

  return (
    <View
      testID={`commitment-row-${index}`}
      className={`rounded-xl border px-3 py-3 ${
        valid ? "border-line" : "border-danger"
      }`}
    >
      <View className="flex-row items-center gap-2">
        <TextInput
          testID={`commitment-name-${index}`}
          value={name}
          onChangeText={(text) => {
            setName(text);
            onChange({ ...commitment, name: text });
          }}
          placeholder="Nombre"
          className="flex-1 font-hanken text-[15px] text-foreground"
        />
        <Pressable
          testID={`remove-commitment-${index}`}
          onPress={onRemove}
          hitSlop={10}
        >
          <X size={16} colorClassName="text-foreground/45" />
        </Pressable>
      </View>

      <View className="mt-2 flex-row items-baseline gap-2">
        <Text className="font-newsreader text-[16px] text-foreground/45">
          S/
        </Text>
        <TextInput
          testID={`commitment-amount-${index}`}
          value={formatAmount(amountDigits)}
          onChangeText={(raw) => {
            const next = raw.replace(/\D/g, "").slice(0, 9);
            setAmountDigits(next);
            onChange({
              ...commitment,
              amountCents: next ? Number(next) * 100 : 0,
            });
          }}
          keyboardType="number-pad"
          placeholder="0"
          className="w-20 font-newsreader text-[16px] text-foreground"
        />
        <Text className="ml-auto font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase">
          CADA DÍA
        </Text>
        <TextInput
          testID={`commitment-day-${index}`}
          value={day}
          onChangeText={(raw) => {
            const next = raw.replace(/\D/g, "").slice(0, 2);
            setDay(next);
            onChange({ ...commitment, dueDay: next ? Number(next) : 0 });
          }}
          keyboardType="number-pad"
          placeholder="—"
          className="w-8 text-right font-hanken-semibold text-[14px] text-foreground"
        />
      </View>
    </View>
  );
}
