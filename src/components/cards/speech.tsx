"use client";

import { useEffect, useRef, useState } from "react";
import type { Library } from "@/lib/content/library";
import { buzzMiss, tapOk } from "@/lib/native/haptics";
import { canRecognizeJapanese, listen, ListenError, type Listening } from "@/lib/native/stt";
import { buildReadingIndex, matchSpoken, type ReadingIndex } from "@/lib/speech/match";
import type { StudyItem } from "@/lib/srs/decks";
import { strings } from "@/lib/strings";
import { useSettings } from "@/store/settings";

// Shared by the speaking review card and the path's "say it" step.

export type SpeechPhase =
  | { kind: "idle" }
  | { kind: "listening"; partial: string }
  | { kind: "right"; heard: string }
  | { kind: "wrong"; heard: string }
  | { kind: "error"; permission: boolean };

/** Speaking practice is on and the device can listen; null while checking. */
export function useSpeakingEnabled(): boolean | null {
  const on = useSettings((s) => s.speakingPractice);
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    canRecognizeJapanese().then(setAvailable);
  }, []);
  return on ? available : false;
}

const indexes = new WeakMap<Library, ReadingIndex>();

/** Every word's reading by how it's written, for homophones (built once per library). */
export function readingIndexOf(library: Library): ReadingIndex {
  let index = indexes.get(library);
  if (!index) {
    index = buildReadingIndex([...library.decks["vocab-n5"], ...library.decks["vocab-n4"]]);
    indexes.set(library, index);
  }
  return index;
}

/**
 * One listen-and-check at a time for `item`. `toggle` starts listening, or
 * stops it early; `onChecked` hears every finished attempt.
 */
export function useSpeechCheck(
  item: StudyItem,
  index: ReadingIndex,
  onChecked?: (ok: boolean) => void,
) {
  const [phase, setPhase] = useState<SpeechPhase>({ kind: "idle" });
  const session = useRef<Listening | null>(null);
  const onCheckedRef = useRef(onChecked);
  useEffect(() => {
    onCheckedRef.current = onChecked;
  });

  // Don't leave the microphone on when the card goes away.
  useEffect(() => () => session.current?.stop(), []);

  const toggle = () => {
    if (session.current) {
      session.current.stop();
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
        if (ok) tapOk();
        else buzzMiss();
        setPhase(ok ? { kind: "right", heard } : { kind: "wrong", heard });
        onCheckedRef.current?.(ok);
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

  /** Stops listening and ignores whatever it would have heard. */
  const cancel = () => {
    const s = session.current;
    session.current = null;
    s?.stop();
  };

  return { phase, toggle, cancel };
}

export function MicButton({
  phase,
  onClick,
  disabled,
}: {
  phase: SpeechPhase;
  onClick: () => void;
  disabled?: boolean;
}) {
  const t = strings.review.speak;
  const listening = phase.kind === "listening";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? t.stop : t.start}
      className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white active:opacity-80 disabled:opacity-40 ${
        phase.kind === "right" ? "bg-kun" : "bg-accent"
      }`}
    >
      {listening && (
        <span
          className="absolute inset-0 animate-ping rounded-full bg-accent opacity-40"
          aria-hidden
        />
      )}
      <MicIcon />
    </button>
  );
}

/** What happened with the last attempt, under the mic. */
export function SpeechStatus({ phase, extra }: { phase: SpeechPhase; extra?: string }) {
  const t = strings.review.speak;
  return (
    <p className="min-h-6 text-center" aria-live="polite">
      {phase.kind === "idle" && <span className="text-muted">{t.tapToSpeak}</span>}
      {phase.kind === "listening" &&
        (phase.partial ? (
          <span className="font-hand text-xl">{phase.partial}</span>
        ) : (
          <span className="text-muted">{t.listening}</span>
        ))}
      {phase.kind === "right" && (
        <span className="font-medium text-kun">{strings.review.correct}</span>
      )}
      {phase.kind === "wrong" && (
        <span>
          {phase.heard ? t.heard(phase.heard) : t.heardNothing}
          {extra && <span className="text-muted"> {extra}</span>}
        </span>
      )}
      {phase.kind === "error" && (
        <span className="text-muted">{phase.permission ? t.noPermission : t.failed}</span>
      )}
    </p>
  );
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
