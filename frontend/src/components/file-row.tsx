import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/src/icons";
import { formatBytes, formatDate, kindIcon, kindTint } from "@/src/lib/format";
import type { FileEntry } from "@/src/lib/fs";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

function Thumb({ entry, big }: { entry: FileEntry; big?: boolean }) {
  const styles = useStyles();
  const tint = kindTint(entry.kind);
  if (entry.kind === "image") {
    return (
      <Image
        source={{ uri: entry.uri }}
        style={big ? styles.gridThumbImg : styles.thumbImg}
        contentFit="cover"
        transition={120}
      />
    );
  }
  return (
    <View style={[big ? styles.gridThumb : styles.thumb, { backgroundColor: tint + "22" }]}>
      <Icon name={kindIcon(entry.kind)} size={big ? 34 : 24} color={tint} />
    </View>
  );
}

export function FileRow({
  entry,
  mode,
  selected,
  selectionMode,
  favorite,
  onPress,
  onLongPress,
  onMore,
}: {
  entry: FileEntry;
  mode: "list" | "grid";
  selected?: boolean;
  selectionMode?: boolean;
  favorite?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onMore?: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();

  const meta = entry.isDir ? "Folder" : `${formatBytes(entry.size)} · ${formatDate(entry.modified)}`;

  if (mode === "grid") {
    return (
      <Pressable
        testID={`file-grid-${entry.name}`}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[styles.gridItem, selected && styles.selectedCard]}
      >
        <View>
          <Thumb entry={entry} big />
          {selectionMode && (
            <View style={[styles.checkGrid, selected && styles.checkOn]}>
              {selected && <Icon name="check" size={14} color={colors.onBrandPrimary} />}
            </View>
          )}
          {favorite && !selectionMode && (
            <View style={styles.favBadge}>
              <Icon name="star" size={13} color={colors.onBrandPrimary} />
            </View>
          )}
        </View>
        <Text style={styles.gridName} numberOfLines={2}>
          {entry.name}
        </Text>
        <Text style={styles.gridMeta} numberOfLines={1}>
          {entry.isDir ? "Folder" : formatBytes(entry.size)}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={`file-row-${entry.name}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.row, selected && styles.selectedRow]}
    >
      {selectionMode ? (
        <View style={[styles.check, selected && styles.checkOn]}>
          {selected && <Icon name="check" size={15} color={colors.onBrandPrimary} />}
        </View>
      ) : (
        <Thumb entry={entry} />
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {favorite && <Icon name="star" size={17} color={colors.brandPrimary} />}
      {entry.isDir ? (
        <Icon name="chevron-right" size={22} color={colors.muted} />
      ) : (
        onMore && (
          <Pressable testID={`file-more-${entry.name}`} onPress={onMore} hitSlop={8} style={styles.moreBtn}>
            <Icon name="dots-vertical" size={20} color={colors.muted} />
          </Pressable>
        )
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  selectedRow: { backgroundColor: c.brandSecondary },
  selectedCard: { borderColor: c.brandPrimary, borderWidth: 2 },
  thumb: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  thumbImg: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  info: { flex: 1 },
  name: { fontSize: 15.5, fontWeight: "600", color: c.onSurface },
  meta: { fontSize: 12.5, color: c.muted, marginTop: 2 },
  moreBtn: { padding: spacing.xs },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  gridItem: {
    flex: 1,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
    gap: 6,
  },
  gridThumb: { width: "100%", aspectRatio: 1.3, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  gridThumbImg: { width: "100%", aspectRatio: 1.3, borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  gridName: { fontSize: 13.5, fontWeight: "600", color: c.onSurface },
  gridMeta: { fontSize: 11.5, color: c.muted },
  checkGrid: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  favBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
}));
