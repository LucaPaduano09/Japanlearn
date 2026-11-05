"use client";

import { useEffect, useRef, useState } from "react";
import { SpeakerIcon } from "@/components/cards/ListenCard";
import { SecondaryButton } from "@/components/ui/Button";
import { buzzMiss, tapOk } from "@/lib/native/haptics";
import { listen, ListenError, type Listening } from "@/lib/native/stt";
import { speak } from "@/lib/native/tts";
import { matchSpoken, type ReadingIndex } from "@/lib/speech/match";
import type { StudyItem } from "@/lib/srs/decks";
import type { CharacterGrade } from "@/lib/strokes/compare";
import { strings } from "@/lib/strings";

/** Tries before the card counts as missed. */
const ATTEMPTS = 3;
/** How long a right answer stays before the result screen. */
const REVEAL_MS = 900;

type Phase =
  | { kind: "idle" }
  | { kind: "listening"; partial: string }
  | { kind: "right"; heard: string }
  | { kind: "wrong"; heard: string }
  | { kind: "error"; permission: boolean };

/** Shows a word → the learner reads it aloud → the recognizer checks it. */
export function SpeakCard({
  item,
  index,
  autoplayAudio,
  onAnswer,
  onSkip,
}: {
  item: StudyItem;
  /** Other words' readings, so a homophone spelled differently still counts. */
  index: ReadingIndex;
  autoplayAudio: boolean;
  onAnswer: (grade: CharacterGrade, mistakes: number) => void;
  /** "Can't speak now": leave the spoken cards for later. */
  onSkip: () => void;
}) {
  const t = strings.review.speak;
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [misses, setMisses] = useState(0);
  const [heardModel, setHeardModel] = useState(false);
  const session = useRef<Listening | null>(null);

  const onAnswerRef = useRef(onAnswer);
  useEffect(() => {
    onAnswerRef.current = onAnswer;
  });

  // Don't leave the microphone on when the card goes away.
  useEffect(() => () => session.current?.stop(), []);

  useEffect(() => {
    if (phase.kind !== "right") return;
    // Retries or listening first: known, but not well yet.
    const grade = misses > 0 || heardModel ? "hard" : "good";
    const id = setTimeout(
      () => onAnswerRef.current(grade, misses + (heardModel ? 1 : 0)),
      REVEAL_MS,
    );
    return () => clearTimeout(id);
  }, [phase.kind, misses, heardModel]);

  const start = () => {
    if (phase.kind === "listening") {
      session.current?.stop();
      return;
    }
    setPhase({ kind: "listening", partial: "" });
    const s = listen((partial) => setPhase({ kind: "listening", partial }));
    session.current = s;
    s.result.then(
      (transcripts) => {
        if (session.current !== s) return;
        session.current = null;
        const { ok, heard } = matchSpoken(item, transcripts, index);
        if (ok) {
          tapOk();
          if (autoplayAudio) speak(item.reading);
          setPhase({ kind: "right", heard });
          return;
        }
        buzzMiss();
        const n = misses + 1;
        setMisses(n);
        if (n >= ATTEMPTS) {
          onAnswerRef.current("again", n);
          return;
        }
        setPhase({ kind: "wrong", heard });
      },
      (e) => {
        if (session.current !== s) return;
        session.current = null;
        setPhase({
          kind: "error",
          permission: e instanceof ListenError && e.kind === "permission",
        });
      },
    );
  };

  const listening = phase.kind === "listening";
  const done = phase.kind === "right";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <p className="text-center text-sm text-muted">{strings.review.prompts.speak}</p>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="font-hand text-7xl leading-tight break-all">{item.chars.join("")}</p>
        {item.meaning && <p className="text-muted">{item.meaning}</p>}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={done}
          aria-pressed={listening}
          aria-label={listening ? t.stop : t.start}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white active:opacity-80 disabled:opacity-40 ${
            done ? "bg-kun" : "bg-accent"
          }`}
        >
          {listening && (
            <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-40" aria-hidden />
          )}
          <MicIcon />
        </button>
        <p className="min-h-6 text-center" aria-live="polite">
          <Status phase={phase} attemptsLeft={ATTEMPTS - misses} />
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SecondaryButton
          onClick={() => {
            setHeardModel(true);
            speak(item.reading);
          }}
          disabled={listening || done}
          className="flex items-center justify-center gap-2"
        >
          <SpeakerIcon />
          {t.hear}
        </SecondaryButton>
        <SecondaryButton
          onClick={() => {
            session.current?.stop();
            session.current = null;
            onAnswer("again", misses + 1);
          }}
          disabled={done}
        >
          {t.dontKnow}
        </SecondaryButton>
      </div>
      <button
        type="button"
        onClick={() => {
          session.current?.stop();
          session.current = null;
          onSkip();
        }}
        disabled={done}
        className="text-sm text-muted underline-offset-4 active:opacity-70 disabled:opacity-40"
      >
        {t.cantNow}
      </button>
    </div>
  );
}

function Status({ phase, attemptsLeft }: { phase: Phase; attemptsLeft: number }) {
  const t = strings.review.speak;
  switch (phase.kind) {
    case "idle":
      return <span className="text-muted">{t.tapToSpeak}</span>;
    case "listening":
      return phase.partial ? (
        <span className="font-hand text-xl">{phase.partial}</span>
      ) : (
        <span className="text-muted">{t.listening}</span>
      );
    case "right":
      return <span className="font-medium text-kun">{strings.review.correct}</span>;
    case "wrong":
      return (
        <span>
          {phase.heard ? t.heard(phase.heard) : t.heardNothing}{" "}
          <span className="text-muted">{t.attemptsLeft(attemptsLeft)}</span>
        </span>
      );
    case "error":
      return <span className="text-muted">{phase.permission ? t.noPermission : t.failed}</span>;
  }
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="relative h-8 w-8" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path
        d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}
