import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/icons";
import { haptic } from "@/src/components/ui";
import { useFileOpener } from "@/src/hooks/use-file-opener";
import { getMeta } from "@/src/lib/db";
import {
  extractEntities,
  parseIntent,
  searchFiles,
  summarizeText,
  walkAll,
} from "@/src/lib/ai";
import { isTextViewable } from "@/src/lib/format";
import { readText, type FileEntry } from "@/src/lib/fs";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Action = { label: string; route?: string; params?: any };
type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  files?: FileEntry[];
  chooser?: "summarize" | "extract";
  actions?: Action[];
};

const SUGGESTIONS = [
  "Find my PDFs from 2026",
  "Show large videos",
  "Find receipts",
  "Merge PDFs and compress",
  "Find duplicate files",
];

let idc = 0;
const nid = () => `m${idc++}`;

export default function AiWorkspace() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const open = useFileOpener();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: nid(),
      role: "ai",
      text: "Hi! I'm your on-device Files AI. Everything runs offline on your phone. Ask me to find, summarize, organize, merge or extract from your files.",
    },
  ]);
  const [input, setInput] = useState("");

  const push = (m: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: nid() }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const getDocText = async (e: FileEntry): Promise<string | null> => {
    if (isTextViewable(e.name)) {
      try {
        return await readText(e.uri);
      } catch {
        return null;
      }
    }
    const m = await getMeta(e.uri);
    return m?.ocr || null;
  };

  const runChooser = async (kind: "summarize" | "extract", e: FileEntry) => {
    push({ role: "user", text: e.name });
    const text = await getDocText(e);
    if (!text) {
      push({
        role: "ai",
        text: `I can read text documents and OCR'd scans offline. "${e.name}" has no extractable text yet. Open it in the PDF viewer and tap Extract Text, or run OCR on a scan first.`,
      });
      return;
    }
    if (kind === "summarize") {
      push({ role: "ai", text: `Summary of ${e.name}:\n\n${summarizeText(text, 5)}` });
    } else {
      const en = extractEntities(text);
      const parts: string[] = [];
      if (en.dates.length) parts.push(`Dates: ${en.dates.slice(0, 5).join(", ")}`);
      if (en.amounts.length) parts.push(`Amounts: ${en.amounts.slice(0, 5).join(", ")}`);
      if (en.emails.length) parts.push(`Emails: ${en.emails.slice(0, 3).join(", ")}`);
      if (en.phones.length) parts.push(`Phones: ${en.phones.slice(0, 3).join(", ")}`);
      if (en.ids.length) parts.push(`IDs: ${en.ids.slice(0, 3).join(", ")}`);
      push({
        role: "ai",
        text: parts.length ? `Extracted from ${e.name}:\n\n${parts.join("\n")}` : `No structured data (dates, amounts, IDs) found in ${e.name}.`,
      });
    }
  };

  const offerChooser = async (kind: "summarize" | "extract") => {
    const all = await walkAll();
    const docs: FileEntry[] = [];
    for (const e of all) {
      if (isTextViewable(e.name)) docs.push(e);
      else {
        const m = await getMeta(e.uri);
        if (m?.ocr) docs.push(e);
      }
    }
    if (!docs.length) {
      push({
        role: "ai",
        text: "I don't have any text documents or OCR'd scans indexed yet. Scan a document or run OCR on an image, then ask me again.",
      });
      return;
    }
    push({
      role: "ai",
      text: kind === "summarize" ? "Which document should I summarize?" : "Which document should I extract data from?",
      files: docs.slice(0, 12),
      chooser: kind,
    });
  };

  const handle = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    push({ role: "user", text });
    setInput("");
    const intent = parseIntent(text);

    if (intent === "search") {
      const results = await searchFiles(text);
      push({
        role: "ai",
        text: results.length ? `Found ${results.length} matching file${results.length === 1 ? "" : "s"}:` : "No files matched that search. Try different words, or import/scan more files.",
        files: results.slice(0, 15),
      });
    } else if (intent === "summarize") {
      offerChooser("summarize");
    } else if (intent === "extract") {
      offerChooser("extract");
    } else if (intent === "merge") {
      push({ role: "ai", text: "I can merge your PDFs and keep them memory-efficient. Open the PDF workspace, tap Merge, pick your PDFs in order.", actions: [{ label: "Open PDF Merge", route: "/(tabs)/pdf" }] });
    } else if (intent === "images_to_pdf") {
      push({ role: "ai", text: "Let's turn your images into a PDF.", actions: [{ label: "Images → PDF", route: "/tools", params: { open: "images_to_pdf" } }] });
    } else if (intent === "duplicates") {
      push({ role: "ai", text: "I'll scan your files for exact duplicates by content hash.", actions: [{ label: "Find duplicates", route: "/duplicates" }] });
    } else if (intent === "organize") {
      push({ role: "ai", text: "I can auto-categorize your files. You'll review and confirm before anything moves.", actions: [{ label: "Smart Organize", route: "/organize" }] });
    } else if (intent === "compress") {
      push({ role: "ai", text: "I can optimize PDFs to reduce size. Open the PDF workspace and tap Compress.", actions: [{ label: "Open PDF tools", route: "/(tabs)/pdf" }] });
    } else if (intent === "ocr") {
      push({ role: "ai", text: "OCR reads text from scans and images offline. Scan a document or run OCR from a file's menu.", actions: [{ label: "Open Scanner", route: "/scanner" }] });
    } else if (intent === "translate") {
      push({
        role: "ai",
        text: "Offline translation isn't available on-device without a language model, so I won't pretend to translate. I can summarize the document or extract key details offline instead — just ask.",
      });
    } else {
      push({
        role: "ai",
        text: "I can help you find, summarize, extract, organize, merge, compress and de-duplicate files — all offline. Try: \"Find my invoices from 2026\".",
      });
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.brandRow}>
          <View style={styles.aiIcon}>
            <Icon name="robot-happy" size={22} color={colors.onBrandPrimary} />
          </View>
          <View>
            <Text style={styles.title}>Files AI</Text>
            <View style={styles.badgeRow}>
              <Icon name="shield-check" size={12} color={colors.success} />
              <Text style={styles.badge}>On-device · Offline</Text>
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => (
            <View key={m.id}>
              <View style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.bubbleText, m.role === "user" && styles.userText]}>{m.text}</Text>
              </View>
              {m.files && m.files.length > 0 && (
                <View style={styles.resultList}>
                  {m.files.map((f) => (
                    <Pressable
                      key={f.uri}
                      testID={`ai-file-${f.name}`}
                      style={styles.resultRow}
                      onPress={() => (m.chooser ? runChooser(m.chooser, f) : open(f.uri, f.name))}
                    >
                      <Icon name="file-outline" size={18} color={colors.brandPrimary} />
                      <Text style={styles.resultName} numberOfLines={1}>
                        {f.name}
                      </Text>
                      <Icon name={m.chooser ? "arrow-right" : "open-in-new"} size={16} color={colors.muted} />
                    </Pressable>
                  ))}
                </View>
              )}
              {m.actions && (
                <View style={styles.actionsRow}>
                  {m.actions.map((a) => (
                    <Pressable
                      key={a.label}
                      testID={`ai-action-${a.label}`}
                      style={styles.actionChip}
                      onPress={() => {
                        haptic();
                        router.push({ pathname: a.route as any, params: a.params });
                      }}
                    >
                      <Text style={styles.actionChipText}>{a.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {messages.length <= 2 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestsWrap} contentContainerStyle={styles.suggests}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} testID={`ai-suggest`} style={styles.suggestChip} onPress={() => handle(s)}>
                <Text style={styles.suggestText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput
            testID="ai-input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your files…"
            placeholderTextColor={colors.muted}
            onSubmitEditing={() => handle(input)}
            returnKeyType="send"
          />
          <Pressable
            testID="ai-send"
            style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
            disabled={!input.trim()}
            onPress={() => handle(input)}
          >
            <Icon name="send" size={20} color={colors.onBrandPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  aiIcon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: c.onSurface },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  badge: { fontSize: 12, color: c.muted, fontWeight: "600" },
  bubble: { maxWidth: "88%", padding: spacing.md, borderRadius: radius.lg },
  aiBubble: { backgroundColor: c.surfaceSecondary, alignSelf: "flex-start", borderWidth: 1, borderColor: c.border, borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: c.brandPrimary, alignSelf: "flex-end", borderTopRightRadius: 4 },
  bubbleText: { fontSize: 14.5, color: c.onSurfaceSecondary, lineHeight: 21 },
  userText: { color: c.onBrandPrimary },
  resultList: { marginTop: spacing.sm, gap: 6, alignSelf: "flex-start", width: "88%" },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  resultName: { flex: 1, fontSize: 14, fontWeight: "600", color: c.onSurface },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  actionChip: { backgroundColor: c.brandSecondary, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  actionChipText: { color: c.onBrandTertiary, fontWeight: "700", fontSize: 13.5 },
  suggestsWrap: { flexGrow: 0, maxHeight: 52 },
  suggests: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: "center" },
  suggestChip: { height: 38, justifyContent: "center", backgroundColor: c.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: c.border },
  suggestText: { fontSize: 13, color: c.onSurfaceTertiary, fontWeight: "500" },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.divider,
    backgroundColor: c.surface,
  },
  input: {
    flex: 1,
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: c.onSurfaceTertiary,
  },
  sendBtn: { width: 46, height: 46, borderRadius: radius.pill, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
}));
