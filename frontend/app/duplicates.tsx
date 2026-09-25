import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDialog } from "@/src/components/dialog";
import { EmptyState } from "@/src/components/empty-state";
import { ScreenHeader } from "@/src/components/screen-header";
import { useToast } from "@/src/components/toast";
import { ProgressOverlay } from "@/src/components/ui";
import { Icon } from "@/src/icons";
import { addTrash, deleteMeta } from "@/src/lib/db";
import { walkAll } from "@/src/lib/ai";
import { formatBytes } from "@/src/lib/format";
import { moveToTrash, readBase64, type FileEntry } from "@/src/lib/fs";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const HASH_LIMIT = 25 * 1024 * 1024; // 25 MB

export default function Duplicates() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const dialog = useDialog();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  const groupsQ = useQuery({
    queryKey: ["duplicates"],
    queryFn: async () => {
      const files = (await walkAll()).filter((f) => !f.isDir && f.size > 0);
      const bySize: Record<number, FileEntry[]> = {};
      files.forEach((f) => (bySize[f.size] = [...(bySize[f.size] || []), f]));
      const groups: FileEntry[][] = [];
      for (const arr of Object.values(bySize)) {
        if (arr.length < 2) continue;
        const byHash: Record<string, FileEntry[]> = {};
        for (const f of arr) {
          let key = `${f.size}`;
          if (f.size <= HASH_LIMIT) {
            try {
              const b64 = await readBase64(f.uri);
              key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, b64);
            } catch {
              key = `${f.size}-${f.name}`;
            }
          } else {
            key = `${f.size}-${f.name}`;
          }
          byHash[key] = [...(byHash[key] || []), f];
        }
        for (const g of Object.values(byHash)) if (g.length > 1) groups.push(g);
      }
      return groups.sort((a, b) => b[0].size * b.length - a[0].size * a.length);
    },
  });

  const groups = groupsQ.data ?? [];
  const wasted = groups.reduce((acc, g) => acc + g[0].size * (g.length - 1), 0);

  const cleanGroup = async (g: FileEntry[]) => {
    const ok = await dialog.confirm({
      title: `Remove ${g.length - 1} duplicate${g.length - 1 === 1 ? "" : "s"}?`,
      message: "The first copy is kept; the rest move to Trash (recoverable).",
      confirmText: "Move to Trash",
      destructive: true,
    });
    if (!ok) return;
    setBusy("Cleaning…");
    try {
      for (const f of g.slice(1)) {
        const t = await moveToTrash(f);
        await addTrash(t);
        await deleteMeta(f.uri);
      }
      toast.show("Duplicates moved to Trash", "success");
    } finally {
      setBusy(null);
      qc.invalidateQueries({ queryKey: ["duplicates"] });
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["storage"] });
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Duplicate finder" subtitle={groups.length ? `${formatBytes(wasted)} recoverable` : undefined} />
      {groupsQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
          <Text style={styles.scanning}>Scanning by content hash…</Text>
        </View>
      ) : groups.length === 0 ? (
        <EmptyState icon="check-decagram" title="No duplicates found" subtitle="Your files are all unique. Nice and tidy!" testID="dupes-empty" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}>
          {groups.map((g, gi) => (
            <View key={gi} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>
                  {g.length} copies · {formatBytes(g[0].size)} each
                </Text>
                <Pressable testID={`dupe-clean-${gi}`} style={styles.cleanBtn} onPress={() => cleanGroup(g)}>
                  <Icon name="broom" size={16} color={colors.onBrandPrimary} />
                  <Text style={styles.cleanText}>Clean</Text>
                </Pressable>
              </View>
              {g.map((f, i) => (
                <View key={f.uri} style={styles.fileRow}>
                  <Icon name={i === 0 ? "shield-check" : "file-outline"} size={18} color={i === 0 ? colors.success : colors.muted} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {f.name}
                  </Text>
                  {i === 0 && <Text style={styles.keepTag}>Keep</Text>}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
      <ProgressOverlay visible={!!busy} label={busy ?? undefined} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  scanning: { fontSize: 14, color: c.muted },
  group: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: c.border, gap: spacing.sm },
  groupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  groupTitle: { fontSize: 14, fontWeight: "700", color: c.onSurface },
  cleanBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.brandPrimary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  cleanText: { color: c.onBrandPrimary, fontWeight: "700", fontSize: 12.5 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
  fileName: { flex: 1, fontSize: 13.5, color: c.onSurfaceSecondary },
  keepTag: { fontSize: 11, fontWeight: "700", color: c.success },
}));
