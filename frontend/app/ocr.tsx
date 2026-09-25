import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { ScreenHeader } from "@/src/components/screen-header";
import { useToast } from "@/src/components/toast";
import { Chip } from "@/src/components/ui";
import { Icon } from "@/src/icons";
import { getMeta, upsertMeta } from "@/src/lib/db";
import { baseName, getExt } from "@/src/lib/format";
import { createFolder, joinDir, listDir, readBase64, ROOT, uniqueName, writeText, TMP } from "@/src/lib/fs";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const OCR_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
</head><body>
<script>
var RN=window.ReactNativeWebView;
function post(o){try{RN.postMessage(JSON.stringify(o));}catch(e){}}
(function(){
  if(!window.Tesseract){post({type:'error',message:'engine'});return;}
  try{
    Tesseract.recognize(window.__IMG__, window.__LANG__, {
      logger:function(m){ if(m.status==='recognizing text'){ post({type:'progress',progress:m.progress}); } else { post({type:'status',status:m.status}); } }
    }).then(function(r){ post({type:'done', text:(r.data&&r.data.text)||''}); })
      .catch(function(e){ post({type:'error', message:String(e&&e.message)}); });
  }catch(e){ post({type:'error', message:String(e&&e.message)}); }
})();
</script></body></html>`;

export default function Ocr() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { uri, name } = useLocalSearchParams<{ uri: string; name: string }>();

  const [lang, setLang] = useState<"eng" | "hin" | "eng+hin">("eng");
  const [imgData, setImgData] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading image…");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const b64 = await readBase64(uri);
        const ext = getExt(name) || "jpg";
        const mime = ext === "png" ? "image/png" : "image/jpeg";
        setImgData(`data:${mime};base64,${b64}`);
      } catch {
        setError("Could not read image");
      }
    })();
  }, [uri, name]);

  const injected = useMemo(
    () => (imgData ? `window.__IMG__=${JSON.stringify(imgData)};window.__LANG__=${JSON.stringify(lang)};true;` : "true;"),
    [imgData, lang],
  );

  const onMessage = (e: any) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === "status") setStatus(m.status);
      else if (m.type === "progress") {
        setProgress(m.progress);
        setStatus("Recognizing text…");
      } else if (m.type === "done") {
        setResult(m.text || "");
        setProgress(1);
      } else if (m.type === "error") setError(m.message || "OCR failed");
    } catch {}
  };

  const rerun = (l: typeof lang) => {
    setLang(l);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus("Restarting…");
    setRunKey((k) => k + 1);
  };

  const saveTxt = async () => {
    if (!result) return;
    const ocrDir = ROOT + "OCR/";
    const rootEntries = await listDir(ROOT).catch(() => []);
    if (!rootEntries.some((e) => e.isDir && e.name === "OCR")) await createFolder(ROOT, "OCR");
    const fn = await uniqueName(ocrDir, `${baseName(name)}.txt`);
    const dest = joinDir(ocrDir, fn);
    await writeText(dest, result);
    // index against source file if it lives in the workspace
    if (uri.startsWith(ROOT)) {
      const m = await getMeta(uri);
      await upsertMeta(uri, name, { ocr: result, category: m?.category || "" });
    }
    await upsertMeta(dest, fn, { ocr: result });
    qc.invalidateQueries({ queryKey: ["files"] });
    toast.show("Saved as searchable text", "success");
  };

  const share = async () => {
    if (!result) return;
    const tmp = TMP + `${baseName(name)}.txt`;
    await writeText(tmp, result);
    if (await Sharing.isAvailableAsync()) Sharing.shareAsync(tmp);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="OCR — Extract text" subtitle={name} />
      <View style={styles.langRow}>
        <Chip label="English" active={lang === "eng"} onPress={() => rerun("eng")} testID="ocr-eng" />
        <Chip label="हिन्दी" active={lang === "hin"} onPress={() => rerun("hin")} testID="ocr-hin" />
        <Chip label="Both" active={lang === "eng+hin"} onPress={() => rerun("eng+hin")} testID="ocr-both" />
      </View>

      {error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={40} color={colors.error} />
          <Text style={styles.centerText}>{error}</Text>
          <Text style={styles.hint}>OCR downloads its language model once (needs internet the first time), then runs on-device.</Text>
        </View>
      ) : result === null ? (
        <View style={styles.center}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
          </View>
          <Text style={styles.centerText}>{status}</Text>
          <Text style={styles.hint}>Reading {lang === "hin" ? "Hindi" : lang === "eng+hin" ? "Hindi + English" : "English"} text on-device…</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.resultWrap}>
            <Text style={styles.resultText} selectable testID="ocr-result">
              {result.trim() || "No text detected in this image."}
            </Text>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
            <Pressable testID="ocr-share" style={[styles.btn, styles.ghost]} onPress={share}>
              <Icon name="share-variant" size={18} color={colors.onSurfaceTertiary} />
              <Text style={styles.ghostText}>Share</Text>
            </Pressable>
            <Pressable testID="ocr-save" style={[styles.btn, styles.primary]} onPress={saveTxt}>
              <Icon name="content-save" size={18} color={colors.onBrandPrimary} />
              <Text style={styles.primaryText}>Save searchable text</Text>
            </Pressable>
          </View>
        </>
      )}

      {imgData && result === null && !error && Platform.OS !== "web" && (
        <WebView
          key={runKey}
          testID="ocr-webview"
          source={{ html: OCR_HTML }}
          injectedJavaScriptBeforeContentLoaded={injected}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          style={styles.hiddenWeb}
        />
      )}
      {Platform.OS === "web" && result === null && !error && (
        <View style={styles.center}>
          <Icon name="cellphone" size={40} color={colors.muted} />
          <Text style={styles.centerText}>Run OCR on your device.</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  langRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.md },
  centerText: { fontSize: 15, color: c.onSurface, fontWeight: "600", textAlign: "center" },
  hint: { fontSize: 13, color: c.muted, textAlign: "center", lineHeight: 19, maxWidth: 300 },
  progressCircle: { width: 96, height: 96, borderRadius: 48, borderWidth: 5, borderColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  progressPct: { fontSize: 22, fontWeight: "800", color: c.brandPrimary },
  resultWrap: { padding: spacing.lg, paddingBottom: 100 },
  resultText: { fontSize: 15, color: c.onSurface, lineHeight: 23 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: c.divider, backgroundColor: c.surface },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md },
  ghost: { flex: 1, backgroundColor: c.surfaceTertiary },
  ghostText: { color: c.onSurfaceTertiary, fontWeight: "600", fontSize: 14 },
  primary: { flex: 2, backgroundColor: c.brandPrimary },
  primaryText: { color: c.onBrandPrimary, fontWeight: "700", fontSize: 14 },
  hiddenWeb: { position: "absolute", width: 1, height: 1, opacity: 0 },
}));
