import { addVault, listVault, removeVault, type VaultRow } from "./db";
import { deleteForever, ensure, joinDir, uniqueName, VAULT } from "./fs";
import { getKind, type FileEntry } from "./format";
import * as FileSystem from "expo-file-system/legacy";

export async function addToVault(entry: FileEntry): Promise<VaultRow> {
  await ensure(VAULT);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const stored = `${id}__${entry.name}`;
  const vaultPath = joinDir(VAULT, stored);
  await FileSystem.copyAsync({ from: entry.uri, to: vaultPath });
  await deleteForever(entry.uri);
  const row: VaultRow = {
    id,
    name: entry.name,
    vault_path: vaultPath,
    size: entry.size,
    kind: getKind(entry.name),
    added: Date.now(),
  };
  await addVault(row);
  return row;
}

export async function restoreFromVault(row: VaultRow, destDir: string): Promise<string> {
  await ensure(destDir);
  const safe = await uniqueName(destDir, row.name);
  const to = joinDir(destDir, safe);
  await FileSystem.copyAsync({ from: row.vault_path, to });
  await deleteForever(row.vault_path);
  await removeVault(row.id);
  return to;
}

export async function deleteVaultItem(row: VaultRow) {
  await deleteForever(row.vault_path);
  await removeVault(row.id);
}

export { listVault };
