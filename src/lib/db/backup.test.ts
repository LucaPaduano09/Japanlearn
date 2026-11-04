import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  BACKUP_VERSION,
  BackupError,
  backupFileName,
  exportBackup,
  importBackup,
  parseBackup,
} from "./backup";
import { allCards, allItems, getSetting, introduceItem, reviewCard, setSetting } from "./repo";
import { getDb } from "./schema";

const NOW = new Date(2026, 10, 4, 9, 0).getTime();

beforeEach(async () => {
  await Promise.all(getDb().tables.map((t) => t.clear()));
});

describe("backup", () => {
  it("round-trips progress through JSON", async () => {
    await introduceItem("hiragana", "あ", ["recognize"], "good", NOW);
    const [card] = await allCards();
    await reviewCard(card, "good", { durationMs: 1000, mistakes: 0 }, NOW + 600_000);
    await setSetting("introSeen", true);

    const json = JSON.stringify(await exportBackup(NOW));
    await Promise.all(getDb().tables.map((t) => t.clear()));
    expect(await allCards()).toEqual([]);

    await importBackup(parseBackup(JSON.parse(json)));
    expect(await allCards()).toHaveLength(1);
    expect(await allItems()).toHaveLength(1);
    expect(await getDb().reviews.count()).toBe(1);
    expect(await getSetting("introSeen", false)).toBe(true);
  });

  it("replaces existing progress instead of merging", async () => {
    await introduceItem("hiragana", "あ", ["recognize"], "good", NOW);
    const backup = await exportBackup(NOW);
    await introduceItem("hiragana", "い", ["recognize"], "good", NOW);
    await importBackup(backup);
    expect((await allItems()).map((i) => i.itemId)).toEqual(["あ"]);
  });

  it("rejects files that aren't backups", () => {
    expect(() => parseBackup(null)).toThrow(BackupError);
    expect(() => parseBackup({ app: "other" })).toThrow(BackupError);
    expect(() =>
      parseBackup({ app: "kakitai", version: 1, cards: [{}], reviews: [], items: [], settings: [] }),
    ).toThrow(BackupError);
  });

  it("rejects backups from a newer app version", () => {
    expect(() =>
      parseBackup({ app: "kakitai", version: BACKUP_VERSION + 1, cards: [], reviews: [], items: [], settings: [] }),
    ).toThrow("too-new");
  });

  it("names files by date", () => {
    expect(backupFileName(NOW)).toBe("kakitai-backup-2026-11-04.json");
  });
});
