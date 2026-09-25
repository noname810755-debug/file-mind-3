import * as Haptics from "expo-haptics";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/src/icons";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type ToastType = "success" | "error" | "info";
type ToastCtx = { show: (msg: string, type?: ToastType) => void };

const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (m: string, t: ToastType = "info") => {
      setMsg(m);
      setType(t);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          t === "error"
            ? Haptics.NotificationFeedbackType.Error
            : Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      }, 2600);
    },
    [opacity],
  );

  const icon: IconName =
    type === "success" ? "check-circle" : type === "error" ? "alert-circle" : "information";
  const tint =
    type === "success" ? colors.success : type === "error" ? colors.error : colors.info;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.wrap, { opacity, top: insets.top + spacing.md }]}
      >
        <View style={styles.toast} testID="app-toast">
          <Icon name={icon} size={20} color={tint} />
          <Text style={styles.text} numberOfLines={2}>
            {msg}
          </Text>
        </View>
      </Animated.View>
    </Ctx.Provider>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, zIndex: 9999, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceInverse,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    maxWidth: 480,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { color: c.onSurfaceInverse, fontSize: 14, fontWeight: "600", flexShrink: 1 },
}));
