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
import { INTRO_SLIDES, type IntroSlide, SEGMENT_COLORS } from "./intro-slides";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MONO_LABEL = "font-geist-mono text-[10.5px] tracking-[0.18em] uppercase";

const DOT_IDS = ["dot-a", "dot-b", "dot-c"];

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

  const handlePrimaryPress = (slideIndex: number) => {
    if (slideIndex === 0) {
      goToSlide(1);
      return;
    }
    if (slideIndex === 1) {
      goToSlide(2);
      return;
    }
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
          <View style={{ width: SCREEN_WIDTH }} className="px-6">
            <Text className={`${MONO_LABEL} text-foreground/45`}>
              {item.eyebrow}
            </Text>
            <Text className="mt-4 font-newsreader text-[34px] leading-tight text-foreground">
              {item.title}
            </Text>

            {item.body ? (
              <Text className="mt-4 font-hanken text-[15px] text-foreground/70">
                {item.body}
              </Text>
            ) : null}

            {item.quote ? (
              <Text className="mt-6 font-newsreader text-[19px] text-primary">
                {item.quote}
              </Text>
            ) : null}

            {item.segmentBar && item.segments ? (
              <View className="mt-6">
                <View className="h-3 w-full flex-row overflow-hidden rounded-md">
                  {item.segments.map((segment) => (
                    <View
                      key={segment.label}
                      className={SEGMENT_COLORS[segment.color]}
                      style={{
                        width:
                          segment.color === "needs"
                            ? "50%"
                            : segment.color === "wants"
                              ? "30%"
                              : "20%",
                      }}
                    />
                  ))}
                </View>
                <View className="mt-4 gap-2">
                  {item.segments.map((segment) => (
                    <View
                      key={segment.label}
                      className="flex-row items-center justify-between"
                    >
                      <Text className="font-hanken text-[14px] text-foreground/80">
                        {segment.label}
                      </Text>
                      <Text className="font-geist-mono text-[13px] text-foreground/60">
                        {segment.pct}
                      </Text>
                    </View>
                  ))}
                </View>
                {item.segmentNote ? (
                  <Text className="mt-4 font-hanken text-[12.5px] text-foreground/45">
                    {item.segmentNote}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {item.dailyCard ? (
              <View className="mt-6 rounded-xl border border-line px-4 py-4">
                <Text className={`${MONO_LABEL} text-foreground/45`}>
                  {item.dailyCard.label}
                </Text>
                <Text className="mt-2 font-geist-mono text-[28px] text-foreground">
                  {item.dailyCard.value}
                </Text>
              </View>
            ) : null}

            {item.rules ? (
              <View className="mt-4 gap-1.5">
                {item.rules.map((rule) => (
                  <Text
                    key={rule}
                    className="font-hanken text-[13.5px] text-foreground/60"
                  >
                    {rule}
                  </Text>
                ))}
              </View>
            ) : null}

            <View className="mt-8">
              <Pressable
                className="rounded-xl bg-primary px-5 py-4"
                onPress={() => handlePrimaryPress(index)}
              >
                <Text className="text-center font-hanken-semibold text-[15px] text-foreground">
                  {index === 0
                    ? "Cómo funciona"
                    : index === 1
                      ? "Siguiente"
                      : "Crear mi cuenta"}
                </Text>
              </Pressable>
              {index === 0 ? (
                <Pressable
                  className="mt-4 px-5 py-2"
                  onPress={() => router.push("/(auth)/sign-in")}
                >
                  <Text className="text-center font-hanken text-[13.5px] text-foreground/55">
                    Ya tengo cuenta
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      />

      <View className="flex-row items-center justify-center gap-2 pb-8">
        {DOT_IDS.map((dotId, index) => (
          <View
            key={dotId}
            testID={`dot-${index}`}
            className={`h-1 w-6 rounded-full ${
              index === activeIndex ? "bg-foreground" : "bg-line"
            }`}
          />
        ))}
      </View>
    </View>
  );
}
