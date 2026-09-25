import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/screen-header";
import { makeStyles, spacing } from "@/src/theme";

export default function Privacy() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Privacy Policy" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: June 2026</Text>

        <Text style={styles.p}>
          File Mind is built to be private by design. This policy explains how the app handles your information.
        </Text>

        <Text style={styles.h}>1. Offline-first, on-device processing</Text>
        <Text style={styles.p}>
          File Mind works fully offline. Your files, documents, scans, OCR results, tags, favorites and vault contents are stored
          only on your device. We do not run a backend server, cloud database, or user accounts, and we do not upload your files anywhere.
        </Text>

        <Text style={styles.h}>2. Information we do NOT collect</Text>
        <Text style={styles.p}>
          We do not collect, sell, or share your personal data, files, or usage analytics. There is no login and no tracking.
        </Text>

        <Text style={styles.h}>3. Permissions</Text>
        <Text style={styles.p}>
          • Camera — used only when you scan a document. Photos are saved locally.{"\n"}
          • Storage / Files — used to open, import and save your documents.{"\n"}
          • Biometrics — used only to unlock your Secure Vault. Authentication is handled by your device.
          {"\n"}You can revoke any permission in your device settings; related features will simply stop working.
        </Text>

        <Text style={styles.h}>4. One-time internet use</Text>
        <Text style={styles.p}>
          Two optional features may download a component the first time you use them: the offline PDF rendering engine and the
          OCR language models. After the one-time download they run entirely on-device. Core file management never needs internet.
        </Text>

        <Text style={styles.h}>5. Sharing</Text>
        <Text style={styles.p}>
          Files leave the app only when you explicitly use Android’s share or export functionality. You are in control of every share.
        </Text>

        <Text style={styles.h}>6. Data security</Text>
        <Text style={styles.p}>
          Vault files are stored in the app’s private storage and gated by device biometrics. Because data stays on your device,
          keeping your device secure (lock screen, encryption) is the best protection.
        </Text>

        <Text style={styles.h}>7. Children’s privacy</Text>
        <Text style={styles.p}>File Mind does not knowingly collect data from anyone, including children.</Text>

        <Text style={styles.h}>8. Changes</Text>
        <Text style={styles.p}>We may update this policy. Material changes will be reflected here with a new date.</Text>

        <Text style={styles.h}>9. Contact</Text>
        <Text style={styles.p}>Questions? Email us at jarvisai9077@gmail.com.</Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  updated: { fontSize: 13, color: c.muted, marginBottom: spacing.lg },
  h: { fontSize: 16, fontWeight: "700", color: c.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
  p: { fontSize: 14.5, color: c.onSurfaceTertiary, lineHeight: 22 },
}));
