import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDialog } from "@/src/components/dialog";
import { EmptyState } from "@/src/components/empty-state";
import { QueryErrorState } from "@/src/components/query-error";
import { useToast } from "@/src/components/toast";
import { Icon, type IconName } from "@/src/icons";
import { ProgressOverlay, haptic } from "@/src/components/ui";
import { useFileOpener } from "@/src/hooks/use-file-opener";
import { walkAll } from "@/src/lib/ai";
import { formatBytes, formatDate } from "@/src/lib/format";
import { ROOT, parentOf, type FileEntry } from "@/src/lib/fs";
import {
  addPageNumbers,
  addWatermark,
  mergePdfs,
  optimizePdf,
  setMetadata,
  splitPdf,
} from "@/src/lib/pdf";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Tool = "merge" | "split" | "compress" | "watermark" | "numbers" | "metadata";
const TOOLS: { key: Tool | "images"; label: string; icon: IconName; tint: string; multi?: boolean }[] = [
  { key: "merge", label: "Merge", icon: "vector-combine", tint: "#FF5E00", multi: true },
  { key: "split", label: "Split", icon: "call-split", tint: "#E4483C" },
  { key: "images", label: "Images → PDF", icon: "image-multiple", tint: "#2E9E5B" },
  { key: "compress", label: "Compress", icon: "zip-box", tint: "#8B5CF6" },
  { key: "watermark", label: "Watermark", icon: "watermark", tint: "#2563EB" },
  { key: "numbers", label: "Page numbers", icon: "format-list-numbered", tint: "#D97706" },
  { key: "metadata", label: "Metadata", icon: "information-outline", tint: "#0891B2" },
];

export default function PdfWorkspace() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const dialog = useDialog();
  const toast = useToast();
  const open = useFileOpener();

  const [pick, setPick] = useState<{ tool: Tool; multi: boolean } | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const pdfsQ = useQuery({
    queryKey: ["pdf", "all"],
    queryFn: async () => (await walkAll()).filter((e) => e.kind === "pdf").sort((a, b) => b.modified - a.modified),
  });
  const pdfs = pdfsQ.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pdf"] });
    qc.invalidateQueries({ queryKey: ["files"] });
    qc.invalidateQueries({ queryKey: ["home"] });
  };

  const onTool = async (key: Tool | "images") => {
    haptic();
    if (key === "images") {
      router.push({ pathname: "/tools", params: { open: "images_to_pdf" } });
      return;
    }
    if (pdfs.length === 0) return toast.show("Add a PDF first", "info");
    const multi = key === "merge";
    setOrder([]);
    setPick({ tool: key, multi });
  };

  const onPickItem = (e: FileEntry) => {
    if (!pick) return open(e.uri, e.name);
    if (pick.multi) {
      setOrder((prev) => (prev.includes(e.uri) ? prev.filter((u) => u !== e.uri) : [...prev, e.uri]));
    } else {
      runSingle(pick.tool, e);
    }
  };

  const runSingle = async (tool: Tool, e: FileEntry) => {
    setPick(null);
    const destDir = parentOf(e.uri);
    try {
      if (tool === "split") {
        setBusy("Splitting…");
        const created = await splitPdf(e.uri, destDir);
        toast.show(`Split into ${created.length} files`, "success");
      } else if (tool === "compress") {
        setBusy("Optimizing…");
        const { uniqueName, joinDir } = await import("@/src/lib/fs");
        const { baseName } = await import("@/src/lib/format");
        const name = await uniqueName(destDir, `${baseName(e.name)}_compressed.pdf`);
        const r = await optimizePdf(e.uri, joinDir(destDir, name));
        const saved = r.before - r.after;
        toast.show(saved > 0 ? `Saved ${formatBytes(saved)}` : "Optimized", "success");
      } else if (tool === "watermark") {
        const text = await dialog.prompt({ title: "Watermark text", defaultValue: "CONFIDENTIAL", confirmText: "Apply" });
        if (!text) return;
        setBusy("Applying watermark…");
        const { uniqueName, joinDir } = await import("@/src/lib/fs");
        const { baseName } = await import("@/src/lib/format");
        const name = await uniqueName(destDir, `${baseName(e.name)}_watermarked.pdf`);
        await addWatermark(e.uri, text, joinDir(destDir, name));
        toast.show("Watermark added", "success");
      } else if (tool === "numbers") {
        setBusy("Adding page numbers…");
        const { uniqueName, joinDir } = await import("@/src/lib/fs");
        const { baseName } = await import("@/src/lib/format");
        const name = await uniqueName(destDir, `${baseName(e.name)}_numbered.pdf`);
        await addPageNumbers(e.uri, joinDir(destDir, name));
        toast.show("Page numbers added", "success");
      } else if (tool === "metadata") {
        const title = await dialog.prompt({ title: "Document title", placeholder: "Title", confirmText: "Next" });
        if (title === null) return;
        const author = await dialog.prompt({ title: "Author", placeholder: "Author", confirmText: "Save" });
        setBusy("Saving metadata…");
        const { uniqueName, joinDir } = await import("@/src/lib/fs");
        const { baseName } = await import("@/src/lib/format");
        const name = await uniqueName(destDir, `${baseName(e.name)}_meta.pdf`);
        await setMetadata(e.uri, { title, author: author ?? "" }, joinDir(destDir, name));
        toast.show("Metadata saved", "success");
      }
    } catch {
      toast.show("Operation failed", "error");
    } finally {
      setBusy(null);
      invalidate();
    }
  };

  const runMerge = async () => {
    if (order.length < 2) return toast.show("Select at least 2 PDFs", "info");
    const name = await dialog.prompt({ title: "Merged PDF name", defaultValue: "merged", confirmText: "Merge" });
    if (!name) return;
    setPick(null);
    setBusy(`Merging ${order.length} PDFs…`);
    try {
      await mergePdfs(order, ROOT, name);
      toast.show("PDFs merged", "success");
    } catch {
      toast.show("Merge failed", "error");
    } finally {
      setBusy(null);
      setOrder([]);
      invalidate();
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>PDF</Text>
        {pick ? (
          <Pressable testID="pdf-cancel-pick" onPress={() => setPick(null)} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        ) : (
          <Pressable testID="pdf-tools-all" onPress={() => router.push("/tools")} hitSlop={8}>
            <Icon name="dots-horizontal" size={24} color={colors.onSurface} />
          </Pressable>
        )}
      </View>

      {!pick && (
        <View style={styles.toolsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools}>
            {TOOLS.map((t) => (
              <Pressable key={t.key} testID={`pdf-tool-${t.key}`} style={styles.tool} onPress={() => onTool(t.key)}>
                <View style={[styles.toolIcon, { backgroundColor: t.tint + "1A" }]}>
                  <Icon name={t.icon} size={24} color={t.tint} />
                </View>
                <Text style={styles.toolLabel}>{t.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {pick && (
        <View style={styles.pickBanner}>
          <Icon name="information" size={18} color={colors.brandPrimary} />
          <Text style={styles.pickText}>
            {pick.multi ? "Tap PDFs in merge order" : `Select a PDF to ${pick.tool}`}
          </Text>
        </View>
      )}

      {pdfsQ.isError ? (
        <QueryErrorState onRetry={() => pdfsQ.refetch()} message="Could not scan your local PDFs." />
      ) : pdfsQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : pdfs.length === 0 ? (
        <EmptyState
          icon="file-pdf-box"
          title="No PDFs yet"
          subtitle="Create a PDF from images or scans, or import one from your device."
          actionLabel="Scan a document"
          onAction={() => router.push("/scanner")}
          testID="pdf-empty"
        />
      ) : (
        <FlatList
          data={pdfs}
          keyExtractor={(e) => e.uri}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 96, gap: spacing.sm }}
          renderItem={({ item }) => {
            const idx = order.indexOf(item.uri);
            const active = idx >= 0;
            return (
              <Pressable
                testID={`pdf-item-${item.name}`}
                style={[styles.pdfRow, active && styles.pdfRowActive]}
                onPress={() => onPickItem(item)}
              >
                <View style={styles.pdfIcon}>
                  <Icon name="file-pdf-box" size={26} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pdfName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.pdfMeta}>
                    {formatBytes(item.size)} · {formatDate(item.modified)}
                  </Text>
                </View>
                {pick?.multi ? (
                  <View style={[styles.orderBadge, active && styles.orderOn]}>
                    {active ? <Text style={styles.orderNum}>{idx + 1}</Text> : null}
                  </View>
                ) : (
                  <Icon name="chevron-right" size={22} color={colors.muted} />
                )}
              </Pressable>
            );
          }}
        />
      )}

      {pick?.multi && order.length >= 2 && (
        <Pressable testID="pdf-merge-confirm" style={[styles.mergeBtn, { bottom: insets.bottom + spacing.lg }]} onPress={runMerge}>
          <Icon name="vector-combine" size={20} color={colors.onBrandPrimary} />
          <Text style={styles.mergeText}>Merge {order.length} PDFs</Text>
        </Pressable>
      )}

      <ProgressOverlay visible={!!busy} label={busy ?? undefined} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: "800", color: c.onSurface },
  cancel: { fontSize: 15, fontWeight: "600", color: c.brandPrimary },
  toolsWrap: { paddingVertical: spacing.sm },
  tools: { gap: spacing.md, paddingHorizontal: spacing.lg },
  tool: { alignItems: "center", gap: 6, width: 76 },
  toolIcon: { width: 58, height: 58, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  toolLabel: { fontSize: 11.5, fontWeight: "600", color: c.onSurface, textAlign: "center" },
  pickBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: c.brandSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  pickText: { fontSize: 13.5, fontWeight: "600", color: c.onBrandTertiary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pdfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  pdfRowActive: { borderColor: c.brandPrimary, borderWidth: 2 },
  pdfIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: c.error + "1A",
    alignItems: "center",
    justifyContent: "center",
  },
  pdfName: { fontSize: 15, fontWeight: "600", color: c.onSurface },
  pdfMeta: { fontSize: 12.5, color: c.muted, marginTop: 2 },
  orderBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  orderOn: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  orderNum: { color: c.onBrandPrimary, fontWeight: "800", fontSize: 13 },
  mergeBtn: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: c.brandPrimary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    elevation: 6,
  },
  mergeText: { color: c.onBrandPrimary, fontWeight: "700", fontSize: 16 },
}));
