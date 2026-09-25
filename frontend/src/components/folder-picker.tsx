import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDialog } from "@/src/components/dialog";
import { Icon } from "@/src/icons";
import { createFolder, listDir, parentOf, ROOT } from "@/src/lib/fs";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function FolderPicker({
  visible,
  title,
  onCancel,
  onPick,
}: {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onPick: (dir: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const qc = useQueryClient();
  const [dir, setDir] = useState(ROOT);

  const folders = useQuery({
    queryKey: ["folder-picker", dir, visible],
    queryFn: async () => (await listDir(dir)).filter((e) => e.isDir),
    enabled: visible,
  });

  const atRoot = dir === ROOT;
  const label = atRoot ? "File Mind" : decodeURIComponent(dir.replace(ROOT, "").replace(/\/$/, ""));

  const newFolder = async () => {
    const name = await dialog.prompt({ title: "New folder", placeholder: "Folder name", confirmText: "Create" });
    if (!name) return;
    await createFolder(dir, name);
    qc.invalidateQueries({ queryKey: ["folder-picker"] });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          <View style={styles.pathRow}>
            {!atRoot && (
              <Pressable testID="picker-up" onPress={() => setDir(parentOf(dir))} hitSlop={8} style={styles.upBtn}>
                <Icon name="arrow-up" size={18} color={colors.brandPrimary} />
              </Pressable>
            )}
            <Icon name="folder-open" size={18} color={colors.muted} />
            <Text style={styles.pathText} numberOfLines={1}>
              {label}
            </Text>
          </View>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {folders.data && folders.data.length > 0 ? (
              folders.data.map((f) => (
                <Pressable key={f.uri} testID={`picker-folder-${f.name}`} style={styles.folderRow} onPress={() => setDir(f.uri)}>
                  <Icon name="folder" size={22} color={colors.brandPrimary} />
                  <Text style={styles.folderName} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Icon name="chevron-right" size={20} color={colors.muted} />
                </Pressable>
              ))
            ) : (
              <Text style={styles.empty}>No subfolders here</Text>
            )}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable testID="picker-new-folder" style={[styles.btn, styles.ghost]} onPress={newFolder}>
              <Icon name="folder-plus" size={18} color={colors.onSurfaceTertiary} />
              <Text style={styles.ghostText}>New folder</Text>
            </Pressable>
            <Pressable testID="picker-cancel" style={[styles.btn, styles.ghost]} onPress={onCancel}>
              <Text style={styles.ghostText}>Cancel</Text>
            </Pressable>
            <Pressable testID="picker-confirm" style={[styles.btn, styles.primary]} onPress={() => onPick(dir)}>
              <Text style={styles.primaryText}>Save here</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: c.surfaceSecondary,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: "80%",
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.md },
  title: { fontSize: 18, fontWeight: "700", color: c.onSurfaceSecondary, marginBottom: spacing.md },
  pathRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  upBtn: { padding: 2 },
  pathText: { flex: 1, fontSize: 14, fontWeight: "600", color: c.onSurfaceTertiary },
  list: { marginTop: spacing.md, minHeight: 120, maxHeight: 300 },
  folderRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  folderName: { flex: 1, fontSize: 15, fontWeight: "600", color: c.onSurface },
  empty: { color: c.muted, textAlign: "center", paddingVertical: spacing.xl },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.md, borderRadius: radius.md },
  ghost: { flex: 1, backgroundColor: c.surfaceTertiary },
  ghostText: { color: c.onSurfaceTertiary, fontWeight: "600", fontSize: 14 },
  primary: { flex: 1.2, backgroundColor: c.brandPrimary },
  primaryText: { color: c.onBrandPrimary, fontWeight: "700", fontSize: 14 },
}));
