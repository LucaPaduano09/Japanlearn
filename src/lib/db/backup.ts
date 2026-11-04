import type { CardRecord } from "@/lib/srs/queue";
import {
  getDb,
  type ItemRecord,
  type ReviewRecord,
  type SettingRecord,
} from "./schema";

/** Bump when the backup shape changes; older versions must stay importable. */
export const BACKUP_VERSION = 1;
const APP = "kakitai";

export interface Backup {
  app: typeof APP;
  version: number;
  exportedAt: number;
  cards: CardRecord[];
  reviews: ReviewRecord[];
  items: ItemRecord[];
  settings: SettingRecord[];
}

export async function exportBackup(now = Date.now()): Promise<Backup> {
  const db = getDb();
  const [cards, reviews, items, settings] = await Promise.all([
    db.cards.toArray(),
    db.reviews.toArray(),
    db.items.toArray(),
    db.settings.toArray(),
  ]);
  return { app: APP, version: BACKUP_VERSION, exportedAt: now, cards, reviews, items, settings };
}

export class BackupError extends Error {}

/** Checks a parsed JSON file looks like a Kakitai backup we can read. */
export function parseBackup(data: unknown): Backup {
  if (typeof data !== "object" || data === null) throw new BackupError("not-backup");
  const b = data as Partial<Backup>;
  if (b.app !== APP) throw new BackupError("not-backup");
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION) {
    throw new BackupError("too-new");
  }
  for (const key of ["cards", "reviews", "items", "settings"] as const) {
    if (!Array.isArray(b[key])) throw new BackupError("not-backup");
  }
  for (const c of b.cards!) {
    if (typeof c?.id !== "string" || typeof c.due !== "number") {
      throw new BackupError("not-backup");
    }
  }
  return b as Backup;
}

/** Replaces all progress with the backup's, in one transaction. */
export async function importBackup(backup: Backup): Promise<void> {
  const db = getDb();
  await db.transaction("rw", [db.cards, db.reviews, db.items, db.settings], async () => {
    await Promise.all([db.cards.clear(), db.reviews.clear(), db.items.clear(), db.settings.clear()]);
    await db.cards.bulkPut(backup.cards);
    await db.reviews.bulkPut(backup.reviews);
    await db.items.bulkPut(backup.items);
    await db.settings.bulkPut(backup.settings);
  });
}

export function backupFileName(now = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `kakitai-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}
