"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListenCard } from "@/components/cards/ListenCard";
import { RecognizeCard } from "@/components/cards/RecognizeCard";
import { WriteCard } from "@/components/cards/WriteCard";
import { PrimaryButton } from "@/components/ui/Button";
import { loadLibrary, type Library } from "@/lib/content/library";
import { allCards, countDue, nextDue, reviewCard } from "@/lib/db/repo";
import { itemKey, recognizeAnswer, type StudyItem } from "@/lib/srs/decks";
import { formatDue } from "@/lib/srs/format";
import {
  pickChoices,
  planReviews,
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

interface Step {
  card: CardRecord;
  item: StudyItem;
}

interface Answered {
  card: CardRecord;
  item: StudyItem;
  grade: CharacterGrade;
}

const CHOICES = 4;
/** Items listed with their next due date on the summary screen. */
const SUMMARY_ITEMS = 12;

/** An SRS session over the due cards; new items come from the path's stages. */
export function ReviewSession() {
  const settings = useSettings();
  const [library, setLibrary] = useState<Library | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [round, setRound] = useState(0);
  const [pos, setPos] = useState(0);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [reviewed, setReviewed] = useState<Answered[]>([]);
  const [after, setAfter] = useState<{
    dueNow: number;
    next: number | null;
    now: number;
  } | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    loadLibrary().then(setLibrary);
  }, []);

  // Plan (or re-plan, for "keep going") once content and settings are in.
  useEffect(() => {
    if (!library || !settings.loaded) return;
    let cancelled = false;
    allCards().then((cards) => {
      if (cancelled) return;
      const now = Date.now();
      const next: Step[] = planReviews({ cards, limits: settings.limits, now }).flatMap(
        (card) => {
          const item = library.items.get(itemKey(card.deckId, card.itemId));
          return item ? [{ card, item }] : [];
        },
      );
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
    const now = Date.now();
    Promise.all([countDue(now), nextDue()]).then(([dueNow, next]) => {
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
    if (!library || !step || step.card.type !== "recognize") return [];
    const pool = library.decks[step.item.deckId].map(recognizeAnswer);
    return pickChoices(
      recognizeAnswer(step.item),
      pool,
      CHOICES,
      seededRandom(`${step.card.id}#${step.card.reps}`),
    );
  }, [library, step]);

  if (!library || !steps) return null;

  if (steps.length === 0) return <CaughtUp />;

  if (finished) {
    return (
      <SessionDone
        reviewed={reviewed}
        after={after}
        onKeepGoing={() => {
          setReviewed([]);
          setRound((r) => r + 1);
        }}
      />
    );
  }

  const onWritten = (s: Step) =>
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
          {strings.review.position(pos + 1, steps.length)}
        </p>
      </header>

      {answered ? (
        <CardResult answered={answered} onNext={advance} />
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

function CaughtUp() {
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
          {strings.review.caughtUpBody}
          {next && ` ${strings.review.nextDue(formatDue(next.due, next.now))}`}
        </p>
      </div>
      <Link
        href="/"
        className="w-full max-w-xs rounded-2xl bg-accent py-4 text-lg font-semibold text-white active:opacity-80"
      >
        {strings.review.toPath}
      </Link>
    </div>
  );
}

function SessionDone({
  reviewed,
  after,
  onKeepGoing,
}: {
  reviewed: Answered[];
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
          {strings.review.doneBody(reviewed.length)}
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
