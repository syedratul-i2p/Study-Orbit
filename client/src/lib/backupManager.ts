import { getAllChats, saveChat, type ChatConversation } from "./chatStorage";

const BACKUP_DB_NAME = "studyorbit-backups";
const BACKUP_DB_VERSION = 1;
const SNAPSHOT_STORE = "snapshots";
const MAX_SNAPSHOTS = 10;
const AUTO_SNAPSHOT_INTERVAL = 15 * 60 * 1000;
const AUTO_SNAPSHOT_KEY = "studyorbit-last-auto-snapshot";

export interface BackupSnapshot {
  id: string;
  type: "auto" | "manual";
  createdAt: number;
  label: string;
  data: {
    aiChats: ChatConversation[];
    appSettings: Record<string, any>;
  };
  stats: {
    aiChatCount: number;
    totalMessages: number;
    settingsKeys: number;
  };
}

export interface BackupFile {
  version: 2;
  app: "study-orbit";
  exportedAt: number;
  snapshots: BackupSnapshot[];
}

function openBackupDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BACKUP_DB_NAME, BACKUP_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        const store = db.createObjectStore(SNAPSHOT_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("type", "type", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function collectAppSettings(): Record<string, any> {
  const settings: Record<string, any> = {};
  const keys = ["theme", "studyorbit-language", "studyorbit-chat-language"];
  for (const key of keys) {
    const val = localStorage.getItem(key);
    if (val !== null) settings[key] = val;
  }
  return settings;
}

function restoreAppSettings(settings: Record<string, any>) {
  for (const [key, val] of Object.entries(settings)) {
    if (typeof val === "string") {
      localStorage.setItem(key, val);
    }
  }
}

async function gatherBackupData(): Promise<BackupSnapshot["data"]> {
  const aiChats = await getAllChats();
  const appSettings = collectAppSettings();
  return { aiChats, appSettings };
}

function computeStats(data: BackupSnapshot["data"]): BackupSnapshot["stats"] {
  return {
    aiChatCount: data.aiChats.length,
    totalMessages: data.aiChats.reduce((sum, c) => sum + c.messages.length, 0),
    settingsKeys: Object.keys(data.appSettings).length,
  };
}

const MANUAL_SNAPSHOT_ID = "snap-manual-primary";

export async function createSnapshot(type: "auto" | "manual", label?: string): Promise<BackupSnapshot> {
  const data = await gatherBackupData();
  const stats = computeStats(data);
  const now = Date.now();

  let snapshotId: string;
  if (type === "manual") {
    snapshotId = MANUAL_SNAPSHOT_ID;
  } else {
    snapshotId = `snap-auto-${now}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const snapshot: BackupSnapshot = {
    id: snapshotId,
    type,
    createdAt: now,
    label: label || (type === "auto" ? "Auto Snapshot" : "Manual Backup"),
    data,
    stats,
  };
  const db = await openBackupDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
    tx.objectStore(SNAPSHOT_STORE).put(snapshot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  await pruneOldSnapshots();
  return snapshot;
}

async function pruneOldSnapshots() {
  const all = await listSnapshots();
  if (all.length <= MAX_SNAPSHOTS) return;
  const db = await openBackupDB();
  const toDelete = all.slice(MAX_SNAPSHOTS);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
    const store = tx.objectStore(SNAPSHOT_STORE);
    for (const s of toDelete) store.delete(s.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listSnapshots(): Promise<BackupSnapshot[]> {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readonly");
    const request = tx.objectStore(SNAPSHOT_STORE).getAll();
    request.onsuccess = () => {
      const results = (request.result as BackupSnapshot[]).sort(
        (a, b) => b.createdAt - a.createdAt
      );
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getSnapshot(id: string): Promise<BackupSnapshot | undefined> {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readonly");
    const request = tx.objectStore(SNAPSHOT_STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
    tx.objectStore(SNAPSHOT_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function restoreSnapshot(
  snapshot: BackupSnapshot,
  mode: "replace" | "merge"
): Promise<{ restoredChats: number; skippedChats: number; settingsRestored: number }> {
  let restoredChats = 0;
  let skippedChats = 0;

  if (mode === "replace") {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("studyflow-ai-chats", 2);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("conversations", "readwrite");
      tx.objectStore("conversations").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    for (const chat of snapshot.data.aiChats) {
      await saveChat(chat);
      restoredChats++;
    }
  } else {
    const existing = await getAllChats();
    const existingIds = new Set(existing.map((c) => c.id));
    for (const chat of snapshot.data.aiChats) {
      if (existingIds.has(chat.id)) {
        skippedChats++;
      } else {
        await saveChat(chat);
        restoredChats++;
      }
    }
  }

  restoreAppSettings(snapshot.data.appSettings);
  const settingsRestored = Object.keys(snapshot.data.appSettings).length;

  return { restoredChats, skippedChats, settingsRestored };
}

export function exportBackupFile(snapshots: BackupSnapshot[]): string {
  const file: BackupFile = {
    version: 2,
    app: "study-orbit",
    exportedAt: Date.now(),
    snapshots,
  };
  return JSON.stringify(file, null, 2);
}

function isValidSnapshot(s: any): s is BackupSnapshot {
  return (
    s &&
    typeof s.id === "string" &&
    typeof s.createdAt === "number" &&
    typeof s.type === "string" &&
    (s.type === "auto" || s.type === "manual") &&
    typeof s.label === "string" &&
    s.data &&
    Array.isArray(s.data.aiChats) &&
    typeof s.data.appSettings === "object" &&
    s.stats &&
    typeof s.stats.aiChatCount === "number" &&
    typeof s.stats.totalMessages === "number"
  );
}

export function parseBackupFile(content: string): BackupFile {
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON format");
  }
  if (parsed.app !== "study-orbit" || !Array.isArray(parsed.snapshots)) {
    throw new Error("Invalid backup file format");
  }
  const validSnapshots = parsed.snapshots.filter(isValidSnapshot);
  if (validSnapshots.length === 0 && parsed.snapshots.length > 0) {
    throw new Error("No valid snapshots found in backup file");
  }
  return { ...parsed, snapshots: validSnapshots } as BackupFile;
}

export async function importBackupFile(
  file: BackupFile,
  mode: "replace" | "merge"
): Promise<{ imported: number; skipped: number }> {
  const db = await openBackupDB();
  let imported = 0;
  let skipped = 0;

  if (mode === "replace") {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
      tx.objectStore(SNAPSHOT_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  const existing = mode === "merge" ? await listSnapshots() : [];
  const existingIds = new Set(existing.map((s) => s.id));

  for (const snap of file.snapshots) {
    if (mode === "merge" && existingIds.has(snap.id)) {
      skipped++;
      continue;
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
      tx.objectStore(SNAPSHOT_STORE).put(snap);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    imported++;
  }

  await pruneOldSnapshots();
  return { imported, skipped };
}

export function downloadBackupFile(snapshots: BackupSnapshot[]) {
  const json = exportBackupFile(snapshots);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study-orbit-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type ShareBackupResult = "shared" | "downloaded" | "cancelled" | "unsupported";

export async function shareBackupFile(snapshots: BackupSnapshot[]): Promise<ShareBackupResult> {
  const json = exportBackupFile(snapshots);
  const blob = new Blob([json], { type: "application/json" });
  const file = new File(
    [blob],
    `study-orbit-backup-${new Date().toISOString().slice(0, 10)}.json`,
    { type: "application/json" }
  );

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: "Study Orbit Backup",
        text: "My Study Orbit data backup",
        files: [file],
      });
      return "shared";
    } catch {
      downloadBackupFile(snapshots);
      return "cancelled";
    }
  }

  downloadBackupFile(snapshots);
  return "unsupported";
}

export function canShare(): boolean {
  if (typeof navigator === "undefined") return false;
  if (!navigator.share) return false;
  try {
    const testFile = new File(["test"], "test.json", { type: "application/json" });
    return navigator.canShare?.({ files: [testFile] }) ?? false;
  } catch {
    return false;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage?.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

export async function isPersisted(): Promise<boolean> {
  if (navigator.storage?.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

export async function getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
  if (navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      return { used: est.usage || 0, quota: est.quota || 0 };
    } catch {
      return null;
    }
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

let autoSnapshotTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoSnapshots() {
  if (autoSnapshotTimer) return;

  const maybeSnapshot = async () => {
    try {
      const lastStr = localStorage.getItem(AUTO_SNAPSHOT_KEY);
      const last = lastStr ? parseInt(lastStr, 10) : 0;
      if (Date.now() - last < AUTO_SNAPSHOT_INTERVAL) return;

      const chats = await getAllChats();
      if (chats.length === 0) return;

      await createSnapshot("auto", "Auto Snapshot");
      localStorage.setItem(AUTO_SNAPSHOT_KEY, Date.now().toString());
    } catch {
    }
  };

  setTimeout(maybeSnapshot, 5000);
  autoSnapshotTimer = setInterval(maybeSnapshot, AUTO_SNAPSHOT_INTERVAL);
}

export function stopAutoSnapshots() {
  if (autoSnapshotTimer) {
    clearInterval(autoSnapshotTimer);
    autoSnapshotTimer = null;
  }
}
