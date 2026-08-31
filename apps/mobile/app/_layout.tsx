import { Stack } from "expo-router";
// import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import "../global.css";
import { ConvexProvider, ConvexReactClient } from "convex/react";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Convex client: uses EXPO_PUBLIC_CONVEX_URL (Expo-safe env var).
// The URL is the same `NEXT_PUBLIC_CONVEX_URL` used by the web app, copied
// into apps/mobile/.env (gitignored) or set via EAS env vars.
const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL ?? "",
  {
    unsavedChangesWarning: false,
  },
);

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <RootLayoutNav />
    </ConvexProvider>
  );
}

function RootLayoutNav() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}
