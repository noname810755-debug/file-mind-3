import React from "react";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/src/icons";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function QueryErrorState({ onRetry, message = "Could not load this section." }: { onRetry?: () => void; message?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} testID="query-error">
      <View style={styles.icon}><Icon name="alert-circle-outline" size={34} color={colors.error} /></View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && <Pressable testID="query-retry" style={styles.button} onPress={onRetry}><Text style={styles.buttonText}>Try again</Text></Pressable>}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.sm },
  icon: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: c.error + "18", alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  title: { fontSize: 17, fontWeight: "700", color: c.onSurface, textAlign: "center" },
  message: { fontSize: 14, color: c.muted, textAlign: "center", lineHeight: 20, maxWidth: 300 },
  button: { marginTop: spacing.md, minHeight: 44, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill, backgroundColor: c.brandPrimary },
  buttonText: { color: c.onBrandPrimary, fontSize: 14, fontWeight: "700" },
}));
