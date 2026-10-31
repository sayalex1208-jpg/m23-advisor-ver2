// Backing up the farmer's records to a file, since they live only on this
// phone. The file goes wherever the farmer shares it (Telegram "Saved
// Messages" is the usual place) and is restored from there on a new phone.
// No server: the records never pass through ours.

import { todayIso } from "./sprays";

const APP = "m23-cashew-advisor";
// Farm records only; the chat, weather cache and banner settings are not worth carrying over.
const KEYS = ["m23.account", "m23.farm", "m23.sprays", "m23.harvests"] as const;
export const LAST_BACKUP_KEY = "m23.lastBackup";

type BackupFile = { app: typeof APP; version: 1; savedAt: string /* YYYY-MM-DD, local */; data: Partial<Record<(typeof KEYS)[number], unknown>> };

export type BackupSummary = { savedAt: string; sprays: number; sales: number };

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

/** Sprays and sales on this phone: nothing worth backing up when both are zero and there's no farm. */
export function recordCounts(): { sprays: number; sales: number; hasFarm: boolean } {
  const sprays = read("m23.sprays");
  const harvests = read("m23.harvests") as { sales?: unknown[] } | undefined;
  return {
    sprays: Array.isArray(sprays) ? sprays.length : 0,
    sales: Array.isArray(harvests?.sales) ? harvests.sales.length : 0,
    hasFarm: read("m23.farm") !== undefined,
  };
}

export function lastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

/** Shares the backup file (Telegram, Messenger…), or downloads it where sharing files isn't possible. */
export async function saveBackup(): Promise<"shared" | "downloaded" | "cancelled"> {
  const today = todayIso();
  const backup: BackupFile = { app: APP, version: 1, savedAt: today, data: {} };
  for (const key of KEYS) {
    const value = read(key);
    if (value !== undefined) backup.data[key] = value;
  }
  const name = `m23-backup-${today}.json`;
  const file = new File([JSON.stringify(backup)], name, { type: "application/json" });

  const done = () => {
    try {
      localStorage.setItem(LAST_BACKUP_KEY, today);
    } catch {
      // The reminder just shows again; the file was still made.
    }
  };

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "M23 backup" });
      done();
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // Some phones claim they can share files and then can't: fall through to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  done();
  return "downloaded";
}

/** Reads a backup file and says what's in it, without changing anything yet. */
export async function readBackup(file: File): Promise<{ summary: BackupSummary; apply: () => void } | null> {
  let backup: BackupFile;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    return null;
  }
  if (backup?.app !== APP || backup.version !== 1 || typeof backup.data !== "object" || backup.data === null) return null;

  const sprays = backup.data["m23.sprays"];
  const harvests = backup.data["m23.harvests"] as { sales?: unknown[] } | undefined;
  return {
    summary: {
      savedAt: backup.savedAt,
      sprays: Array.isArray(sprays) ? sprays.length : 0,
      sales: Array.isArray(harvests?.sales) ? harvests.sales.length : 0,
    },
    // Replaces this phone's records with the backup's, then reloads so every screen reads them.
    apply: () => {
      for (const key of KEYS) {
        const value = backup.data[key];
        if (value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
      }
      location.reload();
    },
  };
}
