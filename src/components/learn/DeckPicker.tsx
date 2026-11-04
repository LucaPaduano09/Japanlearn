"use client";

import { useEffect, useState } from "react";
import { loadContent } from "@/lib/content/loader";
import { allCards, allItems } from "@/lib/db/repo";
import { buildDecks, DECK_IDS, type DeckId } from "@/lib/srs/decks";
import { strings } from "@/lib/strings";
import { useSettings } from "@/store/settings";

interface DeckStats {
  total: number;
  learned: number;
  due: number;
}

/** The four decks with progress; checked decks feed new items into sessions. */
export function DeckPicker() {
  const activeDecks = useSettings((s) => s.activeDecks);
  const loaded = useSettings((s) => s.loaded);
  const update = useSettings((s) => s.update);
  const [stats, setStats] = useState<Record<DeckId, DeckStats> | null>(null);

  useEffect(() => {
    useSettings.getState().load();
    Promise.all([loadContent(), allItems(), allCards()]).then(
      ([content, items, cards]) => {
        const decks = buildDecks(content);
        const now = Date.now();
        const result = {} as Record<DeckId, DeckStats>;
        for (const id of DECK_IDS) {
          result[id] = {
            total: decks[id].length,
            learned: items.filter((i) => i.deckId === id).length,
            due: cards.filter((c) => c.deckId === id && c.due <= now).length,
          };
        }
        setStats(result);
      },
    );
  }, []);

  const toggle = (id: DeckId) => {
    const on = activeDecks.includes(id);
    // Keep deck order stable so new items come in the intended order.
    update({
      activeDecks: DECK_IDS.filter((d) =>
        d === id ? !on : activeDecks.includes(d),
      ),
    });
  };

  return (
    <section>
      <h2 className="text-lg font-semibold">{strings.decks.title}</h2>
      <p className="mt-1 text-sm text-muted">{strings.decks.hint}</p>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {DECK_IDS.map((id) => {
          const s = stats?.[id];
          const on = activeDecks.includes(id);
          const name = strings.decks.names[id];
          return (
            <li key={id}>
              <label
                className={`flex h-full cursor-pointer flex-col gap-1 rounded-2xl border p-3 ${
                  on ? "border-accent bg-surface" : "border-border bg-surface"
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-hand text-3xl leading-none">
                    {strings.decks.glyphs[id]}
                  </span>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!loaded}
                    onChange={() => toggle(id)}
                    aria-label={strings.decks.include(name)}
                    className="h-5 w-5 accent-[var(--accent)]"
                  />
                </span>
                <span className="font-medium">{name}</span>
                <span className="text-xs text-muted">
                  {s ? strings.decks.progress(s.learned, s.total) : " "}
                </span>
                {s && s.due > 0 && (
                  <span className="text-xs font-medium text-accent">
                    {strings.decks.due(s.due)}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
