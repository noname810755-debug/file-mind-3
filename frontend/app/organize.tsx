import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDialog } from "@/src/components/dialog";
import { EmptyState } from "@/src/components/empty-state";
import { QueryErrorState } from "@/src/components/query-error";
import { ScreenHeader } from "@/src/components/screen-header";
import { useToast } from "@/src/components/toast";
import { ProgressOverlay } from "@/src/components/ui";
import { Icon } from "@/src/icons";
import { walkAll } from "@/src/lib/ai";
import { categorize, type Category } from "@/src/lib/categorize";
import { getMeta, movePath } from "@/src/lib/db";
import { createFolder, joinDir, listDir, moveEntry, ROOT, type FileEntry } from "@/src/lib/fs";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Organize() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const dialog = useDialog();
  const toast = useToast();
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [initDone, setInitDone] = useState(false);

  const plan = useQuery({
    queryKey: ["organize"],
    queryFn: async () => {
      const files = (await walkAll()).filter((f) => !f.isDir);
      const groups: Record<string, FileEntry[]> = {};
      for (const f of files) {
        const parent = f.uri.slice(0, f.uri.lastIndexOf("/"));
        const m = await getMeta(f.uri);
        const cat = categorize(f.name, m?.ocr || "");
        // skip if already inside a matching category folder
        if (parent.endsWith("/" + cat)) continue;
        groups[cat] = [...(groups[cat] || []), f];
      }
      return Object.entries(groups)
        .map(([cat, items]) => ({ cat: cat as Category, items }))
        .sort((a, b) => b.items.length - a.items.length);
    },
  });

  React.useEffect(() => {
    if (plan.data && !initDone) {
      setEnabled(new Set(plan.data.map((g) => g.cat)));
      setInitDone(true);
    }
  }, [plan.data, initDone]);

  const toggle = (cat: string) =>
    setEnabled((prev) => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });

  const apply = async () => {
    const selected = (plan.data ?? []).filter((g) => enabled.has(g.cat));
    const count = selected.reduce((a, g) => a + g.items.length, 0);
    if (!count) return toast.show("Select at least one category", "info");
    const ok = await dialog.confirm({
      title: `Organize ${count} files?`,
      message: "Files move into category folders inside File Mind. Nothing is deleted.",
      confirmText: "Apply",
    });
    if (!ok) return;
    setBusy("Organizing…");
    try {
      const rootEntries = await listDir(ROOT).catch(() => []);
      for (const g of selected) {
        if (!rootEntries.some((e) => e.isDir && e.name === g.cat)) {
          await createFolder(ROOT, g.cat).catch(() => {});
        }
        const dest = joinDir(ROOT, g.cat) + "/";
        for (const f of g.items) {
          try {
            const to = await moveEntry(f, dest);
            await movePath(f.uri, to, f.name);
          } catch {}
        }
      }
      toast.show(`Organized ${count} files`, "success");
    } finally {
      setBusy(null);
      qc.invalidateQueries({ queryKey: ["organize"] });
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    }
  };

  const catIcon = (cat: Category) => {
    const map: Record<string, any> = {
      Receipts: "receipt",
      Invoices: "file-document",
      IDs: "card-account-details",
      Contracts: "file-sign",
      Financial: "bank",
      Medical: "medical-bag",
      Education: "school",
      Work: "briefcase",
      Personal: "account",
      Screenshots: "cellphone-screenshot",
      Documents: "file-multiple",
    };
    return map[cat] || "folder";
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Smart Organize" subtitle="Review, then confirm — nothing moves automatically" />
      {plan.isError ? (
        <QueryErrorState onRetry={() => plan.refetch()} message="Could not prepare the organization plan." />
      ) : plan.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : (plan.data ?? []).length === 0 ? (
        <EmptyState icon="check-all" title="Everything is organized" subtitle="No files need re-filing right now." testID="organize-empty" />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, gap: spacing.md }}>
            {plan.data!.map((g) => {
              const on = enabled.has(g.cat);
              return (
                <Pressable key={g.cat} testID={`org-${g.cat}`} style={[styles.row, on && styles.rowOn]} onPress={() => toggle(g.cat)}>
                  <View style={[styles.icon, { backgroundColor: colors.brandSecondary }]}>
                    <Icon name={catIcon(g.cat)} size={22} color={colors.brandPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cat}>{g.cat}</Text>
                    <Text style={styles.count}>{g.items.length} files → /{g.cat}</Text>
                  </View>
                  <View style={[styles.check, on && styles.checkOn]}>{on && <Icon name="check" size={15} color={colors.onBrandPrimary} />}</View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
            <Pressable testID="organize-apply" style={styles.applyBtn} onPress={apply}>
              <Icon name="auto-fix" size={20} color={colors.onBrandPrimary} />
              <Text style={styles.applyText}>Apply organization</Text>
            </Pressable>
          </View>
        </>
      )}
      <ProgressOverlay visible={!!busy} label={busy ?? undefined} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: c.border },
  rowOn: { borderColor: c.brandPrimary },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cat: { fontSize: 15.5, fontWeight: "700", color: c.onSurface },
  count: { fontSize: 12.5, color: c.muted, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: radius.pill, borderWidth: 2, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: c.divider, backgroundColor: c.surface },
  applyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: c.brandPrimary, paddingVertical: spacing.lg, borderRadius: radius.lg },
  applyText: { color: c.onBrandPrimary, fontWeight: "700", fontSize: 16 },
}));
