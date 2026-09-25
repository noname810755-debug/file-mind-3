import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/screen-header";
import { makeStyles, spacing } from "@/src/theme";

export default function Terms() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Terms & Conditions" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: June 2026</Text>

        <Text style={styles.p}>
          By using File Mind (“the app”), you agree to these Terms & Conditions. If you do not agree, please do not use the app.
        </Text>

        <Text style={styles.h}>1. License</Text>
        <Text style={styles.p}>
          We grant you a personal, non-exclusive, non-transferable license to use File Mind on your device for managing your own files.
        </Text>

        <Text style={styles.h}>2. Your responsibilities</Text>
        <Text style={styles.p}>
          You are responsible for the files you create, import, edit and share, and for keeping your own backups. Only process content
          you have the right to use. Do not use the app for any unlawful purpose.
        </Text>

        <Text style={styles.h}>3. Your data & backups</Text>
        <Text style={styles.p}>
          File Mind stores data locally on your device. Uninstalling the app, clearing its data, or losing the device will remove your
          files and vault contents. We cannot recover them because nothing is stored on our servers. Please keep independent backups of
          important documents.
        </Text>

        <Text style={styles.h}>4. Document operations</Text>
        <Text style={styles.p}>
          Conversions, edits, merges, compression and other operations always let you save a copy or replace the original at your choice.
          While we work to preserve your originals, you accept responsibility for verifying results of any operation.
        </Text>

        <Text style={styles.h}>5. No warranty</Text>
        <Text style={styles.p}>
          The app is provided “as is” without warranties of any kind. Features that rely on device hardware or third-party libraries
          (camera, biometrics, PDF and OCR engines) may vary by device and may be limited by genuine device, filesystem or platform constraints.
        </Text>

        <Text style={styles.h}>6. Limitation of liability</Text>
        <Text style={styles.p}>
          To the maximum extent permitted by law, we are not liable for any loss of data, profits, or any indirect or consequential
          damages arising from your use of the app.
        </Text>

        <Text style={styles.h}>7. Third-party components</Text>
        <Text style={styles.p}>
          The app uses open-source components for PDF and OCR processing. Their respective licenses apply to those components.
        </Text>

        <Text style={styles.h}>8. Changes to the app and terms</Text>
        <Text style={styles.p}>
          We may update the app and these terms over time. Continued use after changes means you accept the updated terms.
        </Text>

        <Text style={styles.h}>9. Contact</Text>
        <Text style={styles.p}>For any questions about these terms, contact jarvisai9077@gmail.com.</Text>
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
