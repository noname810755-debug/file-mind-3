import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { Icon, type IconName } from "@/src/icons";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function haptic(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== "web") Haptics.impactAsync(style).catch(() => {});
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useUi();
  return <View style={[s.card, style]}>{children}</View>;
}

export function IconButton({
  name,
  onPress,
  color,
  size = 22,
  testID,
  bg,
}: {
  name: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
  testID?: string;
  bg?: boolean;
}) {
  const s = useUi();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [s.iconBtn, bg && s.iconBtnBg, pressed && { opacity: 0.6 }]}
      hitSlop={8}
    >
      <Icon name={name} size={size} color={color || colors.onSurface} />
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
  testID?: string;
}) {
  const s = useUi();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={[s.chip, active && s.chipActive]}
    >
      {icon && <Icon name={icon} size={15} color={active ? colors.onBrandPrimary : colors.onSurfaceTertiary} />}
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Fab({
  icon,
  onPress,
  bottom,
  testID,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  bottom: number;
  testID?: string;
  label?: string;
}) {
  const s = useUi();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        haptic(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [s.fab, { bottom }, label ? s.fabExtended : null, pressed && { opacity: 0.85 }]}
    >
      <Icon name={icon} size={24} color={colors.onBrandPrimary} />
      {label && <Text style={s.fabLabel}>{label}</Text>}
    </Pressable>
  );
}

export function ProgressOverlay({ visible, label }: { visible: boolean; label?: string }) {
  const s = useUi();
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.progressBackdrop}>
        <View style={s.progressBox}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={s.progressText}>{label || "Processing…"}</Text>
        </View>
      </View>
    </Modal>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  testID,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  const s = useUi();
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable testID={testID} onPress={onAction} hitSlop={8}>
          <Text style={s.sectionAction}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const useUi = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  iconBtn: { padding: spacing.xs, alignItems: "center", justifyContent: "center" },
  iconBtnBg: {
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.pill,
    width: 40,
    height: 40,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceTertiary,
    borderWidth: 1,
    borderColor: c.border,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { fontSize: 13.5, fontWeight: "600", color: c.onSurfaceTertiary },
  chipTextActive: { color: c.onBrandPrimary },
  fab: {
    position: "absolute",
    right: spacing.lg,
    backgroundColor: c.brandPrimary,
    width: 58,
    height: 58,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: c.brand,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabExtended: { width: "auto", paddingHorizontal: spacing.xl, gap: spacing.sm },
  fabLabel: { color: c.onBrandPrimary, fontWeight: "700", fontSize: 15 },
  progressBackdrop: { flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center" },
  progressBox: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.lg,
    minWidth: 180,
  },
  progressText: { color: c.onSurfaceSecondary, fontSize: 15, fontWeight: "600" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: c.onSurface },
  sectionAction: { fontSize: 14, fontWeight: "600", color: c.brandPrimary },
}));
