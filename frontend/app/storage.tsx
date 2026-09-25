import { useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/screen-header";
import { Card } from "@/src/components/ui";
import { Icon } from "@/src/icons";
import { useFileOpener } from "@/src/hooks/use-file-opener";
import { walkAll } from "@/src/lib/ai";
import { formatBytes, kindIcon, kindTint, type FileKind } from "@/src/lib/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Storage() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const open = useFileOpener();

  const data = useQuery({
    queryKey: ["storage", "analyze"],
    queryFn: async () => {
      let free = 0;
      let total = 0;
      try {
        free = await FileSystem.getFreeDiskStorageAsync();
        total = await FileSystem.getTotalDiskCapacityAsync();
      } catch {}
      const files = await walkAll();
      const byKind: Record<string, { size: number; count: number }> = {};
      let managed = 0;
      for (const f of files) {
        managed += f.size;
        const k = f.kind;
        byKind[k] = { size: (byKind[k]?.size ?? 0) + f.size, count: (byKind[k]?.count ?? 0) + 1 };
      }
      const categories = Object.entries(byKind)
        .map(([k, v]) => ({ kind: k as FileKind, ...v }))
        .sort((a, b) => b.size - a.size);
      const largest = [...files].sort((a, b) => b.size - a.size).slice(0, 8);
      return { free, total, managed, categories, largest };
    },
  });

  const usedPct = data.data && data.data.total > 0 ? ((data.data.total - data.data.free) / data.data.total) * 100 : 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Storage" />
      {data.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
          <Card>
            <Text style={styles.cardTitle}>Device storage</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${usedPct}%` }]} />
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.meta}>{data.data ? formatBytes(data.data.total - data.data.free) : "-"} used</Text>
              <Text style={styles.meta}>{data.data ? formatBytes(data.data.free) : "-"} free</Text>
            </View>
            <View style={styles.managedRow}>
              <Icon name="folder-star" size={16} color={colors.brandPrimary} />
              <Text style={styles.managed}>{data.data ? formatBytes(data.data.managed) : "0"} managed by File Mind</Text>
            </View>
          </Card>

          <View style={styles.actionsRow}>
            <Pressable testID="storage-duplicates" style={styles.actionCard} onPress={() => router.push("/duplicates")}>
              <Icon name="content-duplicate" size={24} color="#E4483C" />
              <Text style={styles.actionLabel}>Find duplicates</Text>
            </Pressable>
            <Pressable testID="storage-trash" style={styles.actionCard} onPress={() => router.push("/trash")}>
              <Icon name="trash-can-outline" size={24} color={colors.muted} />
              <Text style={styles.actionLabel}>Trash</Text>
            </Pressable>
          </View>

          <View>
            <Text style={styles.sectionTitle}>By category</Text>
            <Card style={{ gap: spacing.md }}>
              {data.data?.categories.length ? (
                data.data.categories.map((cat) => (
                  <View key={cat.kind} style={styles.catRow}>
                    <View style={[styles.catIcon, { backgroundColor: kindTint(cat.kind) + "22" }]}>
                      <Icon name={kindIcon(cat.kind)} size={20} color={kindTint(cat.kind)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catName}>{cat.kind[0].toUpperCase() + cat.kind.slice(1)}</Text>
                      <Text style={styles.meta}>{cat.count} items</Text>
                    </View>
                    <Text style={styles.catSize}>{formatBytes(cat.size)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.meta}>No files yet</Text>
              )}
            </Card>
          </View>

          <View>
            <Text style={styles.sectionTitle}>Largest files</Text>
            <Card style={{ gap: spacing.sm }}>
              {data.data?.largest.length ? (
                data.data.largest.map((f) => (
                  <Pressable key={f.uri} testID={`large-${f.name}`} style={styles.largeRow} onPress={() => open(f.uri, f.name)}>
                    <Icon name={kindIcon(f.kind)} size={20} color={kindTint(f.kind)} />
                    <Text style={styles.largeName} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text style={styles.catSize}>{formatBytes(f.size)}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.meta}>No files yet</Text>
              )}
            </Card>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: c.onSurfaceSecondary, marginBottom: spacing.md },
  barTrack: { height: 12, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  barFill: { height: 12, borderRadius: radius.pill, backgroundColor: c.brandPrimary },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  meta: { fontSize: 13, color: c.muted, fontWeight: "500" },
  managedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  managed: { fontSize: 12.5, color: c.onSurfaceTertiary },
  actionsRow: { flexDirection: "row", gap: spacing.md },
  actionCard: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: c.border },
  actionLabel: { fontSize: 13.5, fontWeight: "600", color: c.onSurface },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: c.onSurface, marginBottom: spacing.md },
  catRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  catIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  catName: { fontSize: 15, fontWeight: "600", color: c.onSurface },
  catSize: { fontSize: 13.5, fontWeight: "700", color: c.onSurface },
  largeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 4 },
  largeName: { flex: 1, fontSize: 14, color: c.onSurface },
}));
