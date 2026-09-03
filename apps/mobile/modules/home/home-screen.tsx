import { Pressable, ScrollView, Text, View } from "react-native";
import SignOutButton from "@/shared/components/auth/sign-out-button";
import type { HomeBadgeTone, HomeTone, HomeView } from "./types";

type Props = {
  view: HomeView;
  onRegisterIncome: () => void;
  onReviewAllocations: () => void;
  onSeeEnvelopes: () => void;
};

const TONE_DOT: Record<HomeTone, string> = {
  needs: "bg-needs",
  wants: "bg-wants",
  savings: "bg-savings",
};

const TONE_BAR: Record<HomeTone, string> = {
  needs: "bg-needs",
  wants: "bg-wants",
  savings: "bg-savings",
};

const BADGE_PILL: Record<HomeBadgeTone, string> = {
  stable: "bg-stable/15",
  wait: "bg-foreground/8",
  attention: "bg-warning/15",
  risk: "bg-danger/15",
  starting: "bg-stable/15",
};

const BADGE_DOT: Record<HomeBadgeTone, string> = {
  stable: "bg-stable",
  wait: "bg-foreground/35",
  attention: "bg-warning",
  risk: "bg-danger",
  starting: "bg-stable",
};

const BADGE_TEXT: Record<HomeBadgeTone, string> = {
  stable: "text-stable",
  wait: "text-foreground/55",
  attention: "text-warning",
  risk: "text-danger",
  starting: "text-stable",
};

const TRACK = "bg-[#E8E6DF]";

function Money({
  value,
  size = "lg",
  className = "",
}: {
  value: number;
  size?: "lg" | "sm";
  className?: string;
}) {
  const [intPart, decPart] = value.toFixed(2).split(".");
  const isLg = size === "lg";
  return (
    <Text
      className={`font-newsreader ${isLg ? "text-[64px] leading-17" : "text-[16px] leading-5"} text-foreground ${className}`}
      selectable
    >
      S/{" "}
      <Text
        className={isLg ? "text-[64px] leading-17" : "text-[16px] leading-5"}
      >
        {intPart}
      </Text>
      <Text
        className={`${isLg ? "text-[28px] leading-8" : "text-[12px] leading-4"} text-foreground/45 font-newsreader`}
      >
        .{decPart}
      </Text>
    </Text>
  );
}

function EmptyMoney() {
  return (
    <View className="flex-row items-end gap-3 pt-1">
      <Text className="font-newsreader text-[64px] leading-17 text-foreground/30">
        S/
      </Text>
      <View className="mb-4 h-0 w-[72px] border-b border-dashed border-foreground/25" />
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/45 uppercase">
      {children}
    </Text>
  );
}

function Divider() {
  return <View className="h-px w-full bg-[#E8E6DF]" />;
}

function StatusPill({ label, tone }: { label: string; tone: HomeBadgeTone }) {
  return (
    <View
      className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${BADGE_PILL[tone]}`}
    >
      <View className={`h-1.5 w-1.5 rounded-full ${BADGE_DOT[tone]}`} />
      <Text className={`font-hanken-semibold text-[12px] ${BADGE_TEXT[tone]}`}>
        {label}
      </Text>
    </View>
  );
}

function DashedRule() {
  return (
    <View className="w-full border-t border-dashed border-foreground/20" />
  );
}

export function HomeScreen({
  view,
  onRegisterIncome,
  onReviewAllocations,
  onSeeEnvelopes,
}: Props) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-12 gap-8"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/55 uppercase">
          {view.cycleLabel}
        </Text>
        <View className="flex-row items-center gap-3">
          <StatusPill label={view.badge.label} tone={view.badge.tone} />
          <SignOutButton />
        </View>
      </View>

      <View className="gap-3">
        <SectionLabel>Puedes gastar hoy</SectionLabel>

        {view.kind === "empty" ? (
          <EmptyMoney />
        ) : (
          <View className="pt-1">
            <Money value={view.dailyCents / 100} />
          </View>
        )}

        <Text className="font-hanken text-[14px] text-foreground/55 -mt-1">
          {view.heroHint}
        </Text>

        {view.kind === "empty" ? (
          <View className="pt-2 gap-2">
            <DashedRule />
            <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/35 uppercase">
              {view.cycleHint}
            </Text>
          </View>
        ) : (
          <View className="pt-1 gap-1.5">
            <View
              className={`h-0.75 w-full rounded-full ${TRACK} overflow-hidden`}
            >
              <View
                className="h-full rounded-full bg-stable"
                style={{ width: `${view.cycleProgress}%` }}
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text
                className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/55 uppercase"
                selectable
              >
                {view.daysRemainingLabel}
              </Text>
              <Text
                className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/55 uppercase"
                selectable
              >
                {view.envelopesTotalLabel}
              </Text>
            </View>
          </View>
        )}
      </View>

      <Divider />

      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <SectionLabel>Tus sobres</SectionLabel>
          {view.kind === "empty" ? null : (
            <Pressable onPress={onSeeEnvelopes} hitSlop={8}>
              <Text className="font-hanken-semibold text-[14px] text-stable">
                Ver todos
              </Text>
            </Pressable>
          )}
        </View>

        {view.envelopes.map((envelope) => (
          <View key={envelope.type} className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-baseline gap-2">
                <Text className="font-hanken-semibold text-[15px] text-foreground">
                  {envelope.label}
                </Text>
                {view.kind === "empty" ? (
                  <Text className="font-hanken text-[13px] text-foreground/40">
                    {envelope.suffix}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row items-baseline gap-1">
                <Text
                  className="font-newsreader text-[16px] text-foreground"
                  selectable
                >
                  {envelope.amountLabel}
                </Text>
                {view.kind === "empty" ? null : (
                  <Text className="font-hanken text-[13px] text-foreground/45">
                    {envelope.suffix}
                  </Text>
                )}
              </View>
            </View>
            {view.kind === "empty" ? (
              <DashedRule />
            ) : (
              <View
                className={`h-0.75 w-full rounded-full ${TRACK} overflow-hidden`}
              >
                <View
                  className={`h-full rounded-full ${TONE_BAR[envelope.tone]}`}
                  style={{ width: `${envelope.progress}%` }}
                />
              </View>
            )}
          </View>
        ))}
      </View>

      <View className="flex-row gap-3 pt-1">
        <View className="w-0.5 rounded-full bg-stable" />
        <View className="flex-1 gap-3">
          <Text
            className="font-newsreader text-[20px] leading-6.5 text-foreground"
            selectable
          >
            {view.coachMessage}
          </Text>
          {view.kind === "empty" ? null : (
            <View className="flex-row items-center gap-5">
              <Text className="font-hanken-semibold text-[14px] text-stable">
                Ver detalle
              </Text>
              <Text className="font-hanken-semibold text-[14px] text-foreground/45">
                Entendido
              </Text>
            </View>
          )}
        </View>
      </View>

      {view.kind === "empty" ? (
        <View className="gap-3 pt-4">
          <Pressable
            accessibilityRole="button"
            onPress={onRegisterIncome}
            className="h-14 items-center justify-center rounded-full bg-foreground"
          >
            <Text className="font-hanken-semibold text-[16px] text-background">
              Registrar mi ingreso
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onReviewAllocations}
            hitSlop={8}
            className="items-center py-1"
          >
            <Text className="font-hanken text-[14px] text-foreground/45">
              Revisar mis porcentajes
            </Text>
          </Pressable>
        </View>
      ) : view.movements.length > 0 ? (
        <>
          <Divider />
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <SectionLabel>Hoy</SectionLabel>
              <Text className="font-geist-mono text-[10.5px] tracking-[0.18em] text-foreground/55 uppercase">
                {view.movements.length} movimientos
              </Text>
            </View>
            {view.movements.map((movement) => (
              <View key={movement.id} className="flex-row items-center gap-3">
                <View
                  className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[movement.tone]}`}
                />
                <Text className="flex-1 font-hanken-semibold text-[15px] text-foreground">
                  {movement.name}
                </Text>
                <Text
                  className="font-hanken-semibold text-[15px] text-foreground"
                  selectable
                >
                  {movement.amountLabel}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
