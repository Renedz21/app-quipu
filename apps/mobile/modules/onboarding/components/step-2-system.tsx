import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AmountInput } from "@/modules/onboarding/components/amount-input";
import { FrequencyPicker } from "@/modules/onboarding/components/frequency-picker";
import { WizardShell } from "@/modules/onboarding/components/wizard-shell";
import { useOnboarding } from "@/modules/onboarding/onboarding-provider";
import AuthButton from "@/shared/components/auth/auth-button";
import { FREQ_DRIFT_COPY } from "@/shared/lib/onboarding/defaults";
import type { PayFrequency } from "@/shared/lib/onboarding/types";

const PAYDAY_TEXT: Record<PayFrequency, string> = {
  monthly: "El 1 de cada mes",
  biweekly: "El 15 y 30 de cada mes",
  weekly: "Cada 7 días",
};

const CYCLE_PREVIEW: Record<PayFrequency, string> = {
  monthly: "1 – 30 de cada mes · 30 DÍAS",
  biweekly: "1 – 15 / 16 – 30 · 15 DÍAS",
  weekly: "7 DÍAS",
};

const MONO_LABEL =
  "font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase";

export function Step2System() {
  const { state, dispatch } = useOnboarding();
  const model = state.incomeModel;

  const [frequency, setFrequency] = useState<PayFrequency | null>(
    state.payFrequency,
  );
  const [referenceCents, setReferenceCents] = useState<number | null>(
    state.referenceIncomeCents,
  );
  const [fixedCents, setFixedCents] = useState<number | undefined>(
    state.mixedFixedAmountCents,
  );
  const [cycleDays, setCycleDays] = useState<15 | 30 | undefined>(
    state.cycleDurationDays,
  );
  const [sources, setSources] = useState<string[]>(
    state.variableIncomeSources ?? [],
  );
  const [sourceDraft, setSourceDraft] = useState("");

  if (!model) return null;

  const canContinue =
    model === "fixed"
      ? frequency != null
      : model === "variable"
        ? cycleDays != null && sources.length >= 1
        : frequency != null && fixedCents != null && sources.length >= 1;

  const addSource = () => {
    const name = sourceDraft.trim().slice(0, 30);
    if (name.length < 1 || sources.includes(name)) return;
    setSources([...sources, name]);
    setSourceDraft("");
  };

  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  const continueToStep3 = () => {
    if (!canContinue) return;
    if (model === "fixed") {
      dispatch({
        type: "UPDATE",
        payload: {
          payFrequency: frequency,
          referenceIncomeCents: referenceCents,
        },
      });
    } else if (model === "variable") {
      dispatch({
        type: "UPDATE",
        payload: {
          cycleDurationDays: cycleDays,
          variableIncomeSources: sources,
        },
      });
    } else {
      dispatch({
        type: "UPDATE",
        payload: {
          payFrequency: frequency,
          mixedFixedAmountCents: fixedCents,
          variableIncomeSources: sources,
        },
      });
    }
    dispatch({ type: "SET_STEP", payload: 3 });
  };

  const sourcesSection = (
    <View className="gap-3">
      <Text className={MONO_LABEL}>¿DE DÓNDE LLEGA TU DINERO?</Text>
      <View className="flex-row items-center gap-2">
        <TextInput
          testID="source-input"
          value={sourceDraft}
          onChangeText={(text) => setSourceDraft(text.slice(0, 30))}
          maxLength={30}
          placeholder="Ej. Recibos, ventas, proyectos"
          placeholderTextColor="rgba(0,0,0,0.25)"
          onSubmitEditing={addSource}
          className="h-11 flex-1 rounded-xl border border-line px-4 font-hanken text-[14px] text-foreground"
        />
        <Pressable
          testID="add-source"
          onPress={addSource}
          className="h-11 items-center justify-center rounded-xl bg-foreground px-4"
        >
          <Text className="font-hanken-semibold text-[14px] text-background">
            Agregar
          </Text>
        </Pressable>
      </View>
      {sources.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {sources.map((source, index) => (
            <View
              key={source}
              className="flex-row items-center gap-1.5 rounded-full border border-line px-3 py-1.5"
            >
              <Text
                testID={`source-chip-${index}`}
                className="font-hanken text-[13px] text-foreground"
              >
                {source}
              </Text>
              <Pressable
                testID={`remove-source-${index}`}
                onPress={() => removeSource(index)}
                hitSlop={8}
                className="px-1"
              >
                <Text className="font-hanken text-[13px] text-foreground/45">
                  ×
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <WizardShell
      stepNumber={2}
      footer={
        <AuthButton
          label="Continuar"
          onPress={continueToStep3}
          disabled={!canContinue}
        />
      }
    >
      {model === "fixed" ? (
        <View className="gap-6">
          <View className="gap-1">
            <Text className="font-newsreader text-[28px] text-foreground">
              ¿Cuándo y cuánto?
            </Text>
            <Text className="font-hanken text-[14px] text-foreground/55">
              Con esto armamos tu primer ciclo. Después lo afinamos con datos
              reales.
            </Text>
          </View>

          <View className="gap-3">
            <FrequencyPicker value={frequency} onChange={setFrequency} />
          </View>

          {frequency ? (
            <View className="gap-3">
              <Text className={MONO_LABEL}>DÍA DE PAGO</Text>
              <Text className="font-hanken-semibold text-[15px] text-foreground">
                {PAYDAY_TEXT[frequency]}
              </Text>
              <Text className="font-hanken text-[13px] text-foreground/55">
                {FREQ_DRIFT_COPY[frequency]}
              </Text>
            </View>
          ) : null}

          <AmountInput
            label="CUÁNTO SUELES RECIBIR"
            valueCents={referenceCents}
            onChangeCents={setReferenceCents}
          />
          <Text className="font-hanken text-[13px] text-foreground/55">
            Es solo una referencia para armar el primer ciclo. Cuando registres
            tu ingreso real, Quipu recalcula.
          </Text>

          {frequency ? (
            <View className="rounded-xl border border-line px-4 py-3">
              <Text className={MONO_LABEL}>TU CICLO SERÍA</Text>
              <Text className="mt-1 font-hanken-semibold text-[15px] text-foreground">
                {CYCLE_PREVIEW[frequency]}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {model === "variable" ? (
        <View className="gap-6">
          <View className="gap-1">
            <Text className="font-newsreader text-[28px] text-foreground">
              ¿Cómo se arma tu ciclo?
            </Text>
            <Text className="font-hanken text-[14px] text-foreground/55">
              Sin fecha fija, el ciclo va de un ingreso registrado al siguiente.
            </Text>
          </View>

          <View className="gap-3">
            <Text className={MONO_LABEL}>DURACIÓN DEL CICLO</Text>
            <View className="flex-row gap-2">
              {([15, 30] as const).map((days) => {
                const isActive = cycleDays === days;
                return (
                  <Pressable
                    key={days}
                    testID={`cycle-pill-${days}`}
                    onPress={() => setCycleDays(days)}
                    className={
                      isActive
                        ? "flex-1 items-center rounded-full border border-primary bg-primary/5 px-4 py-2.5"
                        : "flex-1 items-center rounded-full border border-line px-4 py-2.5"
                    }
                  >
                    <Text
                      className={
                        isActive
                          ? "font-hanken-semibold text-[14px] text-foreground"
                          : "font-hanken text-[14px] text-foreground/55"
                      }
                    >
                      {days} días
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {sourcesSection}
        </View>
      ) : null}

      {model === "mixed" ? (
        <View className="gap-6">
          <View className="gap-1">
            <Text className="font-newsreader text-[28px] text-foreground">
              Tu base + lo extra
            </Text>
            <Text className="font-hanken text-[14px] text-foreground/55">
              Define la parte fija y cuéntanos de dónde llega lo variable.
            </Text>
          </View>

          <View className="gap-3">
            <FrequencyPicker value={frequency} onChange={setFrequency} />
          </View>

          {frequency ? (
            <View className="gap-2">
              <Text className={MONO_LABEL}>DÍA DE PAGO</Text>
              <Text className="font-hanken-semibold text-[15px] text-foreground">
                {PAYDAY_TEXT[frequency]}
              </Text>
            </View>
          ) : null}

          <AmountInput
            label="PARTE FIJA APROXIMADA"
            valueCents={fixedCents ?? null}
            onChangeCents={(cents) => setFixedCents(cents ?? undefined)}
          />

          {sourcesSection}
        </View>
      ) : null}
    </WizardShell>
  );
}
