import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { DialogProvider } from "@/src/components/dialog";
import { ToastProvider } from "@/src/components/toast";
import { iconFont } from "@/src/icons";
import { ensureDirs } from "@/src/lib/fs";
import { applyThemePref, loadThemePref } from "@/src/lib/theme-pref";
import { queryClient } from "@/src/query-client";
import { useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  // Prewarm the icon font so glyphs render in Expo Go on first paint.
  const [loaded] = useFonts({ ...iconFont });

  useEffect(() => {
    ensureDirs().catch(() => {});
    loadThemePref().then(applyThemePref).catch(() => {});
  }, []);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: "#F5F6F8" }} />;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <KeyboardProvider>
              <ToastProvider>
                <DialogProvider>
                  <ThemedStatusBar />
                  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F5F6F8" } }}>
                    <Stack.Screen name="scanner" options={{ presentation: "fullScreenModal" }} />
                    <Stack.Screen name="pdf-viewer" options={{ animation: "slide_from_right" }} />
                  </Stack>
                </DialogProvider>
              </ToastProvider>
            </KeyboardProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
