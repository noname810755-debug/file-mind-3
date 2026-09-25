import * as FileSystem from "expo-file-system/legacy";
import { ensure, joinDir, readBase64, uniqueName, writeBase64 } from "./fs";

async function JSZip() {
  const mod = await import("jszip");
  return (mod.default ?? (mod as any)) as typeof import("jszip");
}

export async function createZip(
  files: { uri: string; name: string }[],
  destDir: string,
  zipName: string,
): Promise<string> {
  const Zip = await JSZip();
  const zip = new (Zip as any)();
  for (const f of files) {
    const b64 = await readBase64(f.uri);
    zip.file(f.name, b64, { base64: true });
  }
  const out = await zip.generateAsync({ type: "base64", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const name = await uniqueName(destDir, zipName.endsWith(".zip") ? zipName : zipName + ".zip");
  const uri = joinDir(destDir, name);
  await writeBase64(uri, out);
  return uri;
}

export async function extractZip(zipUri: string, destDir: string): Promise<number> {
  const Zip = await JSZip();
  const b64 = await readBase64(zipUri);
  const zip = await (Zip as any).loadAsync(b64, { base64: true });
  const entries = Object.values(zip.files) as any[];
  let count = 0;
  const folderName = (zipUri.split("/").pop() || "archive").replace(/\.zip$/i, "");
  const target = joinDir(destDir, await uniqueName(destDir, folderName));
  await ensure(target + "/");
  for (const entry of entries) {
    const outPath = joinDir(target, entry.name);
    if (entry.dir) {
      await ensure(outPath.endsWith("/") ? outPath : outPath + "/");
      continue;
    }
    const parent = outPath.slice(0, outPath.lastIndexOf("/") + 1);
    await ensure(parent);
    const content = await entry.async("base64");
    await FileSystem.writeAsStringAsync(outPath, content, {
      encoding: FileSystem.EncodingType.Base64,
    });
    count++;
  }
  return count;
}
