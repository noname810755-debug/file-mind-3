import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useCallback } from "react";

import { useToast } from "@/src/components/toast";
import { ROOT, importInto } from "@/src/lib/fs";

// Imports arbitrary files from the device (SAF / provider) into the app workspace.
export function useImport() {
  const toast = useToast();
  const qc = useQueryClient();

  const importFiles = useCallback(
    async (destDir: string = ROOT): Promise<string[]> => {
      try {
        const res = await DocumentPicker.getDocumentAsync({
          multiple: true,
          copyToCacheDirectory: true,
        });
        if (res.canceled || !res.assets?.length) return [];
        const created: string[] = [];
        for (const a of res.assets) {
          const name = a.name || `file-${Date.now()}`;
          try {
            const to = await importInto(destDir, a.uri, name);
            created.push(to);
          } catch {}
        }
        qc.invalidateQueries({ queryKey: ["files"] });
        qc.invalidateQueries({ queryKey: ["home"] });
        toast.show(`Imported ${created.length} file${created.length === 1 ? "" : "s"}`, "success");
        return created;
      } catch (e: any) {
        toast.show("Import failed", "error");
        return [];
      }
    },
    [qc, toast],
  );

  return importFiles;
}
