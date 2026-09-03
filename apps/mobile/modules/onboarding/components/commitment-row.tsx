import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { X } from "@/shared/components/ui/reicon";
import { commitmentErrorMessage } from "@/shared/lib/onboarding/commitments";
import {
  formatCentsForInput,
  parseSolesToCents,
  sanitizeSolesInput,
} from "@/shared/lib/onboarding/money";
import type { DraftCommitment } from "@/shared/lib/onboarding/types";
import { MonoLabel } from "./mono-label";

function dayDigits(dueDay: number): string {
  return dueDay >= 1 ? String(dueDay) : "";
}

type CommitmentRowProps = {
  index: number;
  commitment: DraftCommitment;
  onChange: (next: DraftCommitment) => void;
  onRemove: () => void;
  showErrors?: boolean;
};

export function CommitmentRow({
  index,
  commitment,
  onChange,
  onRemove,
  showErrors = false,
}: CommitmentRowProps) {
  const dayInputRef = useRef<TextInput>(null);
  const [amountText, setAmountText] = useState(() =>
    formatCentsForInput(commitment.amountCents),
  );

  const error = showErrors ? commitmentErrorMessage(commitment) : null;
  const amountInvalid = showErrors && commitment.amountCents <= 0;
  const dayInvalid =
    showErrors && (commitment.dueDay < 1 || commitment.dueDay > 31);
  const nameInvalid = showErrors && commitment.name.trim().length === 0;

  return (
    <View
      testID={`commitment-row-${index}`}
      className="rounded-xl border border-line px-3 py-3"
    >
      <View className="flex-row items-center gap-2">
        <TextInput
          testID={`commitment-name-${index}`}
          value={commitment.name}
          onChangeText={(text) => onChange({ ...commitment, name: text })}
          placeholder="Nombre"
          className={
            nameInvalid
              ? "flex-1 border-b border-danger pb-0.5 font-hanken text-[15px] text-foreground"
              : "flex-1 font-hanken text-[15px] text-foreground"
          }
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
        <View
          testID={`commitment-amount-field-${index}`}
          className={
            amountInvalid
              ? "min-w-[72px] border-b border-danger pb-0.5"
              : "min-w-[72px] border-b border-line pb-0.5"
          }
        >
          <TextInput
            testID={`commitment-amount-${index}`}
            value={amountText}
            onChangeText={(raw) => {
              const next = sanitizeSolesInput(raw);
              setAmountText(next);
              onChange({
                ...commitment,
                amountCents: parseSolesToCents(next),
              });
            }}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColorClassName="accent-foreground/45"
            underlineColorAndroidClassName="accent-transparent"
            className="min-w-[72px] font-newsreader text-[16px] text-foreground"
          />
        </View>
        <Pressable
          testID={`commitment-day-label-${index}`}
          onPress={() => dayInputRef.current?.focus()}
          hitSlop={8}
          accessible={false}
          className="ml-auto"
        >
          <MonoLabel>CADA DÍA</MonoLabel>
        </Pressable>
        <View
          testID={`commitment-day-field-${index}`}
          className={
            dayInvalid
              ? "min-w-[52px] border-b border-danger pb-0.5"
              : "min-w-[52px] border-b border-line pb-0.5"
          }
        >
          <TextInput
            ref={dayInputRef}
            testID={`commitment-day-${index}`}
            value={dayDigits(commitment.dueDay)}
            onChangeText={(raw) => {
              const next = raw.replace(/\D/g, "").slice(0, 2);
              onChange({ ...commitment, dueDay: next ? Number(next) : 0 });
            }}
            keyboardType="number-pad"
            placeholder="1–31"
            placeholderTextColorClassName="accent-foreground/45"
            underlineColorAndroidClassName="accent-transparent"
            accessibilityLabel="Día del mes, del 1 al 31"
            className="min-w-[52px] text-right font-hanken-semibold text-[14px] text-foreground"
          />
        </View>
      </View>

      {error ? (
        <Text
          testID={`commitment-errors-${index}`}
          className="mt-2 font-hanken text-[12px] text-danger"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
