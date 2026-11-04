"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ItemIntro } from "@/components/cards/ItemIntro";
import { ListenCard } from "@/components/cards/ListenCard";
import { RecognizeCard } from "@/components/cards/RecognizeCard";
import { WriteCard } from "@/components/cards/WriteCard";
import { PrimaryButton } from "@/components/ui/Button";
import { loadContent } from "@/lib/content/loader";
import type { KanjiEntry, VocabEntry } from "@/lib/content/types";
import {
  allCards,
  allItems,
  countDue,
  introduceItem,
  nextDue,
  reviewCard,
} from "@/lib/db/repo";
import {
  buildDecks,
  cardTypesFor,
  itemKey,
  recognizeAnswer,
  type DeckId,
  type StudyItem,
} from "@/lib/srs/decks";
import { formatDue } from "@/lib/srs/format";
import {
  dayKey,
  pickChoices,
  planSession,
  seededRandom,
  type CardRecord,
} from "@/lib/srs/queue";
import {
  gradeCharacter,
  type CharacterGrade,
  type CharacterTally,
} from "@/lib/strokes/compare";
import { strings } from "@/lib/strings";
import { useSettings } from "@/store/settings";

type Step =
  | { kind: "intro"; item: StudyItem }
  | { kind: "card"; card: CardRecord; item: StudyItem };

interface Library {
  decks: Record<DeckId, StudyItem[]>;
  items: Map<string, StudyItem>;
  kanji: Map<string, KanjiEntry>;
  vocab: VocabEntry[];
}

interface Answered {
  card: CardRecord;
  item: StudyItem;
  grade: CharacterGrade;
}

const CHOICES = 4;
/** Items listed with their next due date on the summary screen. */
const SUMMARY_ITEMS = 12;

/** An SRS session: the due cards, then new-item intros (BOOTSTRAP §7). */
export function ReviewSession() {
  const settings = useSettings();
  const [library, setLibrary] = useState<Library | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [round, setRound] = useState(0);
  const [pos, setPos] = useState(0);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [reviewed, setReviewed] = useState<Answered[]>([]);
  const [learned, setLearned] = useState(0);
  const [after, setAfter] = useState<{
    dueNow: number;
    next: number | null;
    now: number;
  } | null>(null);
  const startedAt = useRef(0);
  const pending = useRef<Promise<unknown>[]>([]);

  useEffect(() => {
    useSettings.getState().load();
    loadContent().then((content) => {
      const decks = buildDecks(content);
      const items = new Map(
        Object.values(decks)
          .flat()
          .map((i) => [itemKey(i.deckId, i.id), i]),
      );
      setLibrary({
        decks,
        items,
        kanji: new Map(content.kanji.map((k) => [k.char, k])),
        vocab: content.vocab,
      });
    });
  }, []);

  // Plan (or re-plan, for "keep going") once content and settings are in.
  useEffect(() => {
    if (!library || !settings.loaded) return;
    let cancelled = false;
    Promise.all([allCards(), allItems()]).then(([cards, items]) => {
      if (cancelled) return;
      const now = Date.now();
      const plan = planSession({
        cards,
        decks: library.decks,
        activeDecks: settings.activeDecks,
        introduced: new Set(items.map((i) => i.id)),
        introducedToday: items.filter(
          (i) => dayKey(i.introducedAt) === dayKey(now),
        ).length,
        limits: settings.limits,
        now,
      });
      // Due reviews first (they're the ones that slip), then new items.
      const next: Step[] = [
        ...plan.due.flatMap((card) => {
          const item = library.items.get(itemKey(card.deckId, card.itemId));
          return item ? [{ kind: "card" as const, card, item }] : [];
        }),
        ...plan.newItems.map((item) => ({ kind: "intro" as const, item })),
      ];
      startedAt.current = now;
      setPos(0);
      setAnswered(null);
      setAfter(null);
      setSteps(next);
    });
    return () => {
      cancelled = true;
    };
    // Settings changes mid-session shouldn't reshuffle the queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, settings.loaded, round]);

  const finished = steps !== null && pos >= steps.length;

  useEffect(() => {
    if (!finished) return;
    let cancelled = false;
    Promise.all(pending.current).then(async () => {
      const now = Date.now();
      const [dueNow, next] = await Promise.all([countDue(now), nextDue()]);
      if (!cancelled) setAfter({ dueNow, next, now });
    });
    return () => {
      cancelled = true;
    };
  }, [finished]);

  const advance = useCallback(() => {
    startedAt.current = Date.now();
    setAnswered(null);
    setPos((p) => p + 1);
  }, []);

  const answer = useCallback(
    async (
      card: CardRecord,
      item: StudyItem,
      grade: CharacterGrade,
      mistakes: number,
      showResult: boolean,
    ) => {
      const updated = await reviewCard(card, grade, {
        durationMs: Date.now() - startedAt.current,
        mistakes,
      });
      const entry = { card: updated, item, grade };
      setReviewed((r) => [...r, entry]);
      if (showResult) setAnswered(entry);
      else advance();
    },
    [advance],
  );

  const step = steps?.[pos];

  const choices = useMemo(() => {
    if (!library || step?.kind !== "card" || step.card.type !== "recognize")
      return [];
    const pool = library.decks[step.item.deckId].map(recognizeAnswer);
    return pickChoices(
      recognizeAnswer(step.item),
      pool,
      CHOICES,
      seededRandom(`${step.card.id}#${step.card.reps}`),
    );
  }, [library, step]);

  if (!library || !steps) return null;

  if (steps.length === 0) {
    return <CaughtUp noDecks={settings.activeDecks.length === 0} />;
  }

  if (finished) {
    return (
      <SessionDone
        reviewed={reviewed}
        learned={learned}
        after={after}
        onKeepGoing={() => {
          setReviewed([]);
          setLearned(0);
          setRound((r) => r + 1);
        }}
      />
    );
  }

  const onWritten = (s: Extract<Step, { kind: "card" }>) =>
    (tally: CharacterTally) =>
      answer(s.card, s.item, gradeCharacter(tally), tally.misses + tally.hints, true);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label={strings.review.close}
          className="-ml-2 px-2 text-2xl leading-none text-muted"
        >
          ×
        </Link>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${(pos / steps.length) * 100}%` }}
          />
        </div>
        <p className="text-sm text-muted">
          {step!.kind === "intro" && (
            <span className="mr-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">
              {strings.review.newItem}
            </span>
          )}
          {strings.review.position(pos + 1, steps.length)}
        </p>
      </header>

      {answered ? (
        <CardResult answered={answered} onNext={advance} />
      ) : step!.kind === "intro" ? (
        <ItemIntro
          key={`intro-${pos}`}
          item={step!.item}
          kanji={
            step!.item.deckId === "kanji-n5"
              ? library.kanji.get(step!.item.id)
              : undefined
          }
          vocab={library.vocab}
          strictness={settings.strictness}
          autoplayAudio={settings.autoplayAudio}
          onLearned={(grade) => {
            const item = step!.item;
            pending.current.push(
              introduceItem(item.deckId, item.id, cardTypesFor(item), grade),
            );
            setLearned((n) => n + 1);
          }}
          onNext={advance}
        />
      ) : step!.card.type === "recognize" ? (
        <RecognizeCard
          key={`card-${pos}`}
          item={step!.item}
          choices={choices}
          autoplayAudio={settings.autoplayAudio}
          onAnswer={(correct) =>
            answer(step!.card, step!.item, correct ? "good" : "again", correct ? 0 : 1, false)
          }
        />
      ) : step!.card.type === "write-from-audio" ? (
        <ListenCard
          key={`card-${pos}`}
          item={step!.item}
          strictness={settings.strictness}
          onAnswer={onWritten(step!)}
        />
      ) : (
        <WriteCard
          key={`card-${pos}`}
          item={step!.item}
          type={step!.card.type}
          strictness={settings.strictness}
          onAnswer={onWritten(step!)}
        />
      )}
    </div>
  );
}

/** After a write card: the answer, how it went, and when it comes back. */
function CardResult({
  answered,
  onNext,
}: {
  answered: Answered;
  onNext: () => void;
}) {
  const { item, grade, card } = answered;
  // Captured once so the label doesn't tick while the screen is open.
  const [now] = useState(() => Date.now());
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <p className="font-hand text-8xl break-all">{item.chars.join("")}</p>
      <div>
        <p className="text-2xl font-semibold">{strings.lesson.grades[grade]}</p>
        <p className="mt-1 text-muted">
          {item.romaji ??
            [item.reading, item.meaning].filter(Boolean).join(" · ")}
        </p>
      </div>
      <p className="rounded-full border border-border bg-surface px-4 py-1 text-sm">
        {strings.review.nextReview(formatDue(card.due, now))}
      </p>
      <div className="w-full max-w-sm">
        <PrimaryButton onClick={onNext}>{strings.review.continue}</PrimaryButton>
      </div>
    </div>
  );
}

function CaughtUp({ noDecks }: { noDecks: boolean }) {
  const [next, setNext] = useState<{ due: number; now: number } | null>(null);
  useEffect(() => {
    nextDue().then((due) => due && setNext({ due, now: Date.now() }));
  }, []);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <p className="font-hand text-7xl">済</p>
      <div>
        <h1 className="text-2xl font-semibold">{strings.review.caughtUp}</h1>
        <p className="mt-1 text-muted">
          {noDecks ? strings.review.noDecks : strings.review.caughtUpBody}
          {next && ` ${strings.review.nextDue(formatDue(next.due, next.now))}`}
        </p>
      </div>
      <Link
        href="/learn/"
        className="w-full max-w-xs rounded-2xl bg-accent py-4 text-lg font-semibold text-white active:opacity-80"
      >
        {noDecks ? strings.review.pickDeck : strings.review.learnMore}
      </Link>
    </div>
  );
}

function SessionDone({
  reviewed,
  learned,
  after,
  onKeepGoing,
}: {
  reviewed: Answered[];
  learned: number;
  after: { dueNow: number; next: number | null; now: number } | null;
  onKeepGoing: () => void;
}) {
  // Latest due date per item, so the list shows where each one landed.
  const byItem = new Map<string, Answered>();
  for (const r of reviewed) byItem.set(itemKey(r.item.deckId, r.item.id), r);
  const recent = [...byItem.values()].slice(-SUMMARY_ITEMS);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">{strings.review.done}</h1>
        <p className="mt-1 text-muted">
          {strings.review.doneBody(reviewed.length, learned)}
        </p>
      </div>

      {after && recent.length > 0 && (
        <section className="w-full rounded-2xl border border-border bg-surface p-4 text-left">
          <h2 className="text-sm font-medium text-muted">
            {strings.review.nextTimes}
          </h2>
          <ul className="mt-2 flex flex-col gap-1">
            {recent.map(({ item, card }) => (
              <li
                key={itemKey(item.deckId, item.id)}
                className="flex items-baseline justify-between gap-3"
              >
                <span className="font-hand text-2xl">{item.chars.join("")}</span>
                <span className="text-sm text-muted">
                  {formatDue(card.due, after.now)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {after && after.next !== null && after.dueNow === 0 && (
        <p className="text-muted">
          {strings.review.nextDue(formatDue(after.next, after.now))}
        </p>
      )}

      <div className="flex w-full max-w-sm flex-col gap-3">
        {after && after.dueNow > 0 && (
          <PrimaryButton onClick={onKeepGoing}>
            {strings.review.keepGoing(after.dueNow)}
          </PrimaryButton>
        )}
        <Link
          href="/"
          className="rounded-2xl border border-border bg-surface py-3 font-medium active:opacity-70"
        >
          {strings.review.home}
        </Link>
      </div>
    </div>
  );
}
