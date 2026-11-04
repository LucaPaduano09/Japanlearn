"use client";

import { useEffect, useState } from "react";
import { loadContent } from "@/lib/content/loader";
import { activityTimes, allItems, countDue } from "@/lib/db/repo";
import { buildDecks } from "@/lib/srs/decks";
import { dayKey, planSession, streak } from "@/lib/srs/queue";
import { strings } from "@/lib/strings";
import { useSettings } from "@/store/settings";

interface Summary {
  due: number;
  fresh: number;
  learned: number;
  streak: number;
}

/** Home badges: due now, new items waiting, streak, items learned. */
export function HomeSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const now = Date.now();
    const settings = useSettings.getState();
    Promise.all([
      settings.load(),
      countDue(now),
      allItems(),
      activityTimes(),
      loadContent(),
    ]).then(([, due, items, times, content]) => {
      const { activeDecks, limits } = useSettings.getState();
      // How many new items the next session would introduce.
      const plan = planSession({
        cards: [],
        decks: buildDecks(content),
        activeDecks,
        introduced: new Set(items.map((i) => i.id)),
        introducedToday: items.filter(
          (i) => dayKey(i.introducedAt) === dayKey(now),
        ).length,
        limits,
        now,
      });
      setSummary({
        due,
        fresh: plan.newItems.length,
        learned: items.length,
        streak: streak(times, now),
      });
    });
  }, []);

  return (
    <ul className="flex flex-wrap justify-center gap-2 text-sm" aria-live="polite">
      <Badge>{strings.home.due(summary?.due ?? 0)}</Badge>
      {summary && summary.fresh > 0 && (
        <Badge>{strings.home.newItems(summary.fresh)}</Badge>
      )}
      {summary && summary.streak > 0 && (
        <Badge>{strings.home.streak(summary.streak)}</Badge>
      )}
      {summary && summary.learned > 0 && (
        <Badge>{strings.home.learned(summary.learned)}</Badge>
      )}
    </ul>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full border border-border bg-surface px-4 py-1">
      {children}
    </li>
  );
}
