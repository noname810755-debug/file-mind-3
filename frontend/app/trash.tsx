import { useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDialog } from "@/src/components/dialog";
import { EmptyState } from "@/src/components/empty-state";
import { QueryErrorState } from "@/src/components/query-error";
import { ScreenHeader } from "@/src/components/screen-header";
import { useToast } from "@/src/components/toast";
import { Icon } from "@/src/icons";
import { listTrash, removeTrash } from "@/src/lib/db";
import { formatBytes, formatDate } from "@/src/lib/format";
import { deleteForever, restoreTrash } from "@/src/lib/fs";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Trash() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const dialog = useDialog();
  const toast = useToast();

  const q = useQuery({ queryKey: ["trash"], queryFn: listTrash });
  const items = q.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trash"] });
    qc.invalidateQueries({ queryKey: ["files"] });
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: ["storage"] });
  };

  const restore = async (row: any) => {
    try {
      await restoreTrash({
        id: row.id,
        name: row.name,
        originalPath: row.original_path,
        trashPath: row.trash_path,
        size: row.size,
        isDir: !!row.is_dir,
        deleted: row.deleted,
      });
      await removeTrash(row.id);
      toast.show("Restored", "success");
    } catch {
      toast.show("Restore failed", "error");
    } finally {
      invalidate();
    }
  };

  const remove = async (row: any) => {
    const ok = await dialog.confirm({ title: "Delete permanently?", message: row.name, destructive: true, confirmText: "Delete" });
    if (!ok) return;
    await deleteForever(row.trash_path).catch(() => {});
    await removeTrash(row.id);
    toast.show("Deleted permanently", "success");
    invalidate();
  };

  const emptyTrash = async () => {
    const ok = await dialog.confirm({ title: "Empty Trash?", message: `Permanently delete ${items.length} items.`, destructive: true, confirmText: "Empty Trash" });
    if (!ok) return;
    for (const row of items) {
      await deleteForever(row.trash_path).catch(() => {});
      await removeTrash(row.id);
    }
    toast.show("Trash emptied", "success");
    invalidate();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Trash"
        subtitle={items.length ? `${items.length} items` : undefined}
        actions={items.length ? [{ icon: "delete-sweep", onPress: emptyTrash, testID: "trash-empty", tint: colors.error }] : []}
      />
      {q.isError ? (
        <QueryErrorState onRetry={() => q.refetch()} message="Could not read Trash." />
      ) : q.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState icon="trash-can-outline" title="Trash is empty" subtitle="Deleted files stay here until you remove them." testID="trash-empty-state" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl, gap: spacing.sm }}>
          {items.map((row) => (
            <View key={row.id} style={styles.row}>
              <Icon name={row.is_dir ? "folder" : "file-outline"} size={22} color={colors.muted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={styles.meta}>
                  {formatBytes(row.size)} · deleted {formatDate(row.deleted)}
                </Text>
              </View>
              <Pressable testID={`trash-restore-${row.name}`} onPress={() => restore(row)} hitSlop={8} style={styles.iconBtn}>
                <Icon name="restore" size={22} color={colors.brandPrimary} />
              </Pressable>
              <Pressable testID={`trash-delete-${row.name}`} onPress={() => remove(row)} hitSlop={8} style={styles.iconBtn}>
                <Icon name="trash-can-outline" size={20} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border },
  name: { fontSize: 15, fontWeight: "600", color: c.onSurface },
  meta: { fontSize: 12, color: c.muted, marginTop: 2 },
  iconBtn: { padding: spacing.xs },
}));
