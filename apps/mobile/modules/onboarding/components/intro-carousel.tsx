import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import type { EnvelopeKey } from "@/shared/lib/onboarding/types";
import { ENVELOPE_BG } from "./envelopes";
import { INTRO_SLIDES, type IntroSlide } from "./intro-slides";
import LogoMark from "./logo-mark";
import { MonoLabel } from "./mono-label";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SEGMENT_WIDTH: Record<EnvelopeKey, "50%" | "30%" | "20%"> = {
  needs: "50%",
  wants: "30%",
  savings: "20%",
};

function SegmentBar({
  segments,
  note,
}: {
  segments: NonNullable<IntroSlide["segments"]>;
  note?: string;
}) {
  return (
    <View className="mt-6">
      <View className="h-3 w-full flex-row overflow-hidden rounded-md">
        {segments.map((segment) => (
          <View
            key={segment.label}
            className={ENVELOPE_BG[segment.color]}
            style={{ width: SEGMENT_WIDTH[segment.color] }}
          />
        ))}
      </View>
      <View className="mt-5">
        {segments.map((segment, index) => (
          <View key={segment.label}>
            <View className="flex-row items-start justify-between gap-4 py-3">
              <View className="flex-1 flex-row items-start gap-3">
                <View
                  className={`mt-1 h-2 w-2 rounded-full ${ENVELOPE_BG[segment.color]}`}
                />
                <View className="flex-1">
                  <Text className="font-hanken-semibold text-[15px] text-foreground">
                    {segment.label}
                  </Text>
                  {segment.description ? (
                    <Text className="mt-1 font-hanken text-[13.5px] leading-snug text-foreground/60">
                      {segment.description}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Text className="font-geist-mono text-[13px] text-foreground/60">
                {segment.pct}
              </Text>
            </View>
            {index < segments.length - 1 ? (
              <View className="h-px bg-line" />
            ) : null}
          </View>
        ))}
      </View>
      {note ? (
        <Text className="mt-4 font-hanken text-[12.5px] text-foreground/45">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

function ProgressBar({
  from,
  current,
  to,
  percent,
}: {
  from: { value: string };
  current: { value: string; highlight: string };
  to: { value: string };
  percent: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View className="mt-5">
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <View className="h-full bg-primary" style={{ width: `${clamped}%` }} />
      </View>
      <View className="mt-2 flex-row justify-between">
        <Text className="font-geist-mono text-[10.5px] tracking-wider text-foreground/60">
          {from.value}
        </Text>
        <Text className="font-geist-mono text-[10.5px] tracking-wider text-foreground/60">
          {current.value.split(current.highlight).map((part, i, arr) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static split, order-stable
            <Text key={i}>
              {part}
              {i < arr.length - 1 ? (
                <Text className="text-primary">{current.highlight}</Text>
              ) : null}
            </Text>
          ))}
        </Text>
        <Text className="font-geist-mono text-[10.5px] tracking-wider text-foreground/60">
          {to.value}
        </Text>
      </View>
    </View>
  );
}

function DailyCard({
  label,
  amount,
  cents,
  progress,
}: {
  label: string;
  amount: string;
  cents: string;
  progress: {
    from: { value: string };
    current: { value: string; highlight: string };
    to: { value: string };
    percent: number;
  };
}) {
  return (
    <View className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-5">
      <MonoLabel>{label}</MonoLabel>
      <View className="mt-3 flex-row items-baseline">
        <Text className="font-geist-mono text-[18px] text-foreground/55">
          S/
        </Text>
        <Text className="font-geist-mono text-[56px] leading-none text-foreground">
          {amount}
        </Text>
        <Text className="font-geist-mono text-[22px] text-foreground/55">
          {cents}
        </Text>
      </View>
      <ProgressBar
        from={progress.from}
        current={progress.current}
        to={progress.to}
        percent={progress.percent}
      />
    </View>
  );
}

function RulesList({ rules }: { rules: NonNullable<IntroSlide["rules"]> }) {
  return (
    <View className="mt-6 gap-y-1">
      {rules.map((rule) => (
        <View
          key={rule.left}
          className="flex-row items-baseline justify-between gap-4"
        >
          <Text className="font-hanken text-[14px] text-foreground/80">
            {rule.left}
          </Text>
          <Text
            className={`font-hanken-semibold text-[14px] ${
              rule.tone === "positive" ? "text-primary" : "text-foreground"
            }`}
          >
            {rule.right}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SlideItem({
  slide,
  index,
  onPrimary,
  onSignIn,
  onSkip,
}: {
  slide: IntroSlide;
  index: number;
  onPrimary: (slide: IntroSlide, index: number) => void;
  onSignIn: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-6 pt-2 pb-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          {slide.showLogo ? <LogoMark /> : null}
          <MonoLabel>{slide.eyebrow}</MonoLabel>
        </View>
        {slide.skipLink ? (
          <Pressable hitSlop={12} onPress={onSkip} className="px-2 py-1">
            <Text className="font-hanken text-[14px] text-foreground/55">
              Saltar
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="flex-1 justify-center">
        <Text className="font-newsreader text-[34px] leading-tight text-foreground">
          {slide.title}
        </Text>

        {slide.body ? (
          <Text className="mt-4 font-hanken text-[15px] leading-relaxed text-foreground/70">
            {slide.body}
          </Text>
        ) : null}

        {slide.quote ? (
          <>
            <Text className="mt-6 font-newsreader text-[19px] text-primary">
              {slide.quote}
            </Text>
            <View className="mt-6 h-px bg-line" />
          </>
        ) : null}

        {slide.segmentBar && slide.segments ? (
          <SegmentBar segments={slide.segments} note={slide.segmentNote} />
        ) : null}

        {slide.dailyCard ? (
          <DailyCard
            label={slide.dailyCard.label}
            amount={slide.dailyCard.amount}
            cents={slide.dailyCard.cents}
            progress={slide.dailyCard.progress}
          />
        ) : null}

        {slide.rules ? <RulesList rules={slide.rules} /> : null}
      </View>

      <View>
        <Pressable
          className="rounded-xl bg-foreground px-5 py-4"
          onPress={() => onPrimary(slide, index)}
        >
          <Text className="text-center font-hanken-semibold text-[15px] text-background">
            {slide.cta}
          </Text>
        </Pressable>
        {slide.signInLink ? (
          <Pressable className="mt-4 px-5 py-2" onPress={onSignIn}>
            <Text className="text-center font-hanken text-[13.5px] text-foreground/55">
              Ya tengo cuenta
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function IntroCarousel() {
  const router = useRouter();
  const listRef = useRef<FlatList<IntroSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const goToSlide = (index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(Math.min(Math.max(index, 0), INTRO_SLIDES.length - 1));
  };

  const handlePrimary = (slide: IntroSlide, index: number) => {
    if (slide.ctaAction === "next") {
      goToSlide(index + 1);
      return;
    }
    router.push("/(auth)/sign-in");
  };

  const handleSignIn = () => {
    router.push("/(auth)/sign-in");
  };

  const handleSkip = () => {
    router.push("/(auth)/create-account");
  };

  return (
    <View className="flex-1">
      <FlatList
        ref={listRef}
        testID="intro-list"
        data={INTRO_SLIDES}
        keyExtractor={(_, index) => `slide-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <SlideItem
            slide={item}
            index={index}
            onPrimary={handlePrimary}
            onSignIn={handleSignIn}
            onSkip={handleSkip}
          />
        )}
      />

      <View className="flex-row items-center justify-center gap-2 pb-8">
        {INTRO_SLIDES.map((slide, index) => (
          <View
            key={slide.eyebrow}
            testID={`dot-${index}`}
            className={
              index === activeIndex
                ? "h-1 w-6 rounded-full bg-foreground"
                : "h-1 w-6 rounded-full bg-line"
            }
          />
        ))}
      </View>
    </View>
  );
}
