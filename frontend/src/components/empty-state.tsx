import React from "react";
import { Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/src/icons";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  testID,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={40} color={colors.brandPrimary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Pressable testID="empty-action" onPress={onAction} style={styles.btn}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.sm },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: c.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 17, fontWeight: "700", color: c.onSurface, textAlign: "center" },
  subtitle: { fontSize: 14, color: c.muted, textAlign: "center", lineHeight: 20, maxWidth: 300 },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: c.brandPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  btnText: { color: c.onBrandPrimary, fontWeight: "700", fontSize: 15 },
}));
