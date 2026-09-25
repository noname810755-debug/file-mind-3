import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

let _db: SQLite.SQLiteDatabase | null = null;
let _init: Promise<SQLite.SQLiteDatabase> | null = null;

// Web preview has no native SQLite; use a no-op stub so data screens render
// empty states instead of hanging. Native (device / Expo Go) uses real SQLite.
function webStub(): SQLite.SQLiteDatabase {
  const noop = async () => {};
  return {
    execAsync: noop,
    runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
    getAllAsync: async () => [],
    getFirstAsync: async () => null,
  } as unknown as SQLite.SQLiteDatabase;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === "web") return webStub();
  const db = await SQLite.openDatabaseAsync("filemind.db");
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS meta (
      path TEXT PRIMARY KEY,
      name TEXT,
      favorite INTEGER DEFAULT 0,
      tags TEXT DEFAULT '',
      category TEXT DEFAULT '',
      ocr TEXT DEFAULT '',
      updated INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS recent (
      path TEXT PRIMARY KEY,
      name TEXT,
      opened INTEGER
    );
    CREATE TABLE IF NOT EXISTS trash (
      id TEXT PRIMARY KEY,
      name TEXT,
      original_path TEXT,
      trash_path TEXT,
      size INTEGER,
      is_dir INTEGER,
      deleted INTEGER
    );
    CREATE TABLE IF NOT EXISTS vault (
      id TEXT PRIMARY KEY,
      name TEXT,
      vault_path TEXT,
      size INTEGER,
      kind TEXT,
      added INTEGER
    );
  `);
  return db;
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (!_init) _init = open().then((db) => (_db = db));
  return _init;
}

// ---- meta (favorites / tags / ocr / category) ----
export type Meta = {
  path: string;
  name: string;
  favorite: number;
  tags: string;
  category: string;
  ocr: string;
  updated: number;
};

export async function getMeta(path: string): Promise<Meta | null> {
  const db = await getDb();
  return db.getFirstAsync<Meta>("SELECT * FROM meta WHERE path = ?", [path]);
}

export async function upsertMeta(path: string, name: string, patch: Partial<Meta>) {
  const db = await getDb();
  const existing = await getMeta(path);
  const merged: Meta = {
    path,
    name,
    favorite: patch.favorite ?? existing?.favorite ?? 0,
    tags: patch.tags ?? existing?.tags ?? "",
    category: patch.category ?? existing?.category ?? "",
    ocr: patch.ocr ?? existing?.ocr ?? "",
    updated: Date.now(),
  };
  await db.runAsync(
    `INSERT INTO meta (path, name, favorite, tags, category, ocr, updated)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET name=excluded.name, favorite=excluded.favorite,
       tags=excluded.tags, category=excluded.category, ocr=excluded.ocr, updated=excluded.updated`,
    [merged.path, merged.name, merged.favorite, merged.tags, merged.category, merged.ocr, merged.updated],
  );
  return merged;
}

export async function toggleFavorite(path: string, name: string) {
  const m = await getMeta(path);
  const fav = m?.favorite ? 0 : 1;
  await upsertMeta(path, name, { favorite: fav });
  return fav;
}

export async function listFavorites(): Promise<Meta[]> {
  const db = await getDb();
  return db.getAllAsync<Meta>("SELECT * FROM meta WHERE favorite = 1 ORDER BY updated DESC");
}

export async function searchOcr(term: string): Promise<Meta[]> {
  const db = await getDb();
  return db.getAllAsync<Meta>(
    "SELECT * FROM meta WHERE ocr LIKE ? OR name LIKE ? OR tags LIKE ? LIMIT 200",
    [`%${term}%`, `%${term}%`, `%${term}%`],
  );
}

export async function movePath(oldPath: string, newPath: string, newName: string) {
  const db = await getDb();
  await db.runAsync("UPDATE meta SET path = ?, name = ? WHERE path = ?", [newPath, newName, oldPath]);
  await db.runAsync("UPDATE recent SET path = ?, name = ? WHERE path = ?", [newPath, newName, oldPath]);
}

export async function deleteMeta(path: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM meta WHERE path = ?", [path]);
  await db.runAsync("DELETE FROM recent WHERE path = ?", [path]);
}

// ---- recent ----
export async function addRecent(path: string, name: string) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO recent (path, name, opened) VALUES (?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET opened=excluded.opened`,
    [path, name, Date.now()],
  );
}

export async function listRecent(limit = 20) {
  const db = await getDb();
  return db.getAllAsync<{ path: string; name: string; opened: number }>(
    "SELECT * FROM recent ORDER BY opened DESC LIMIT ?",
    [limit],
  );
}

// ---- trash ----
export async function addTrash(t: {
  id: string;
  name: string;
  originalPath: string;
  trashPath: string;
  size: number;
  isDir: boolean;
  deleted: number;
}) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO trash (id, name, original_path, trash_path, size, is_dir, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [t.id, t.name, t.originalPath, t.trashPath, t.size, t.isDir ? 1 : 0, t.deleted],
  );
}

export type TrashRow = {
  id: string;
  name: string;
  original_path: string;
  trash_path: string;
  size: number;
  is_dir: number;
  deleted: number;
};

export async function listTrash() {
  const db = await getDb();
  return db.getAllAsync<TrashRow>("SELECT * FROM trash ORDER BY deleted DESC");
}

export async function removeTrash(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM trash WHERE id = ?", [id]);
}

// ---- vault ----
export type VaultRow = {
  id: string;
  name: string;
  vault_path: string;
  size: number;
  kind: string;
  added: number;
};

export async function addVault(v: VaultRow) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO vault (id, name, vault_path, size, kind, added) VALUES (?, ?, ?, ?, ?, ?)`,
    [v.id, v.name, v.vault_path, v.size, v.kind, v.added],
  );
}

export async function listVault() {
  const db = await getDb();
  return db.getAllAsync<VaultRow>("SELECT * FROM vault ORDER BY added DESC");
}

export async function removeVault(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM vault WHERE id = ?", [id]);
}
