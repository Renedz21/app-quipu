import { Pressable, Text, View } from "react-native";
import { isCommitmentValid } from "@/modules/onboarding/components/commitment-row";
import { useOnboarding } from "@/modules/onboarding/onboarding-provider";
import { useCompleteOnboarding } from "@/modules/onboarding/use-complete-onboarding";
import { ChevronLeft } from "@/shared/components/ui/reicon";
import {
  CYCLE_DAYS_BY_FREQUENCY,
  estimateDailyAvailable,
  formatDailyAvailable,
  formatSoles,
} from "@/shared/lib/onboarding/daily";

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const MONO_LABEL =
  "font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase";

export function StepConfirm() {
  const { state, dispatch } = useOnboarding();
  const { submit, isSubmitting, error } = useCompleteOnboarding();

  const referenceCents = state.referenceIncomeCents;
  const commitmentsTotalCents = state.commitments
    .filter(isCommitmentValid)
    .reduce((acc, c) => acc + c.amountCents, 0);

  const cycleDays =
    state.incomeModel === "variable"
      ? (state.cycleDurationDays ?? 30)
      : state.payFrequency
        ? CYCLE_DAYS_BY_FREQUENCY[state.payFrequency]
        : 30;

  const dailyCents =
    referenceCents == null
      ? null
      : estimateDailyAvailable({
          referenceIncomeCents: referenceCents,
          commitmentsTotalCents,
          allocationNeeds: state.allocationNeeds,
          allocationWants: state.allocationWants,
          allocationSavings: state.allocationSavings,
          cycleDays,
        });

  const envelopeAmount = (pct: number) =>
    referenceCents == null ? null : Math.floor((referenceCents * pct) / 100);

  const monthLabel = (() => {
    const name = MONTHS[new Date().getMonth()];
    return name.charAt(0).toUpperCase() + name.slice(1);
  })();

  const envelopes = [
    { key: "needs", label: "Necesidades", pct: state.allocationNeeds },
    { key: "wants", label: "Gustos", pct: state.allocationWants },
    { key: "savings", label: "Ahorro", pct: state.allocationSavings },
  ] as const;

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <View className="h-14 flex-row items-center">
        <Pressable
          testID="confirm-back"
          onPress={() => dispatch({ type: "SET_STEP", payload: 4 })}
          hitSlop={12}
          className="-ml-1 px-1 py-2"
        >
          <ChevronLeft size={22} colorClassName="accent-foreground" />
        </Pressable>
      </View>

      <View className="flex-1 pt-4">
        <View className="gap-4">
          <Text className={MONO_LABEL}>CONFIRMA TU SISTEMA</Text>
          <Text className="font-newsreader text-[28px] text-foreground">
            {`Así queda tu ciclo de ${monthLabel}`}
          </Text>
        </View>

        <View
          testID="confirm-daily-card"
          className="mt-6 rounded-xl bg-primary/10 px-4 py-4"
        >
          <Text className={MONO_LABEL}>PODRÁS GASTAR AL DÍA</Text>
          <Text
            testID="confirm-daily"
            className="mt-2 font-geist-mono text-[32px] text-foreground"
          >
            {dailyCents == null ? "—" : formatDailyAvailable(dailyCents)}
          </Text>
          {referenceCents == null ? (
            <Text className="mt-2 font-hanken text-[13px] text-foreground/55">
              Registra tu primer ingreso para ver tu disponible al día.
            </Text>
          ) : null}
        </View>

        <View className="mt-6 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-hanken text-[14px] text-foreground/70">
              Ingreso del ciclo
            </Text>
            <Text
              testID="confirm-income"
              className="font-hanken-semibold text-[14px] text-foreground"
            >
              {referenceCents == null ? "—" : formatSoles(referenceCents)}
            </Text>
          </View>

          {envelopes.map((envelope) => {
            const amount = envelopeAmount(envelope.pct);
            return (
              <View
                key={envelope.key}
                className="flex-row items-center justify-between"
              >
                <Text className="font-hanken text-[14px] text-foreground/70">
                  {envelope.label}
                </Text>
                <Text
                  testID={`confirm-envelope-${envelope.key}`}
                  className="font-hanken-semibold text-[14px] text-foreground"
                >
                  {amount == null
                    ? `${envelope.pct}%`
                    : `${envelope.pct}% · ${formatSoles(amount)}`}
                </Text>
              </View>
            );
          })}

          <View className="flex-row items-center justify-between">
            <Text className="font-hanken text-[14px] text-foreground/70">
              Compromisos reservados
            </Text>
            <Text
              testID="confirm-commitments"
              className="font-hanken-semibold text-[14px] text-foreground"
            >
              {formatSoles(commitmentsTotalCents)}
            </Text>
          </View>
        </View>

        <Text className="mt-6 font-hanken text-[13px] text-foreground/45">
          Puedes cambiar cualquiera de estos números después, desde Ajustes · Tu
          sistema.
        </Text>

        {error ? (
          <Text
            testID="confirm-error"
            className="mt-4 font-hanken text-[13px] text-danger"
          >
            {error}
          </Text>
        ) : null}
      </View>

      <View className="gap-3 pb-4">
        <Pressable
          testID="confirm-submit"
          onPress={submit}
          disabled={isSubmitting}
          className="items-center rounded-xl bg-primary px-5 py-3.5"
        >
          <Text className="font-hanken-semibold text-[15px] text-background">
            {isSubmitting ? "Creando…" : "Empezar mi ciclo"}
          </Text>
        </Pressable>
        <Pressable
          testID="confirm-adjust"
          onPress={() => dispatch({ type: "SET_STEP", payload: 3 })}
          className="items-center py-2"
        >
          <Text className="font-hanken-semibold text-[13px] text-foreground/55">
            Ajustar algo
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
