"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ItemIntro } from "@/components/cards/ItemIntro";
import { SpeakerIcon } from "@/components/cards/ListenCard";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { loadLibrary, type Library } from "@/lib/content/library";
import { allItems, introduceItem } from "@/lib/db/repo";
import { toHiragana, toRomaji } from "@/lib/content/romaji";
import { speak } from "@/lib/native/tts";
import {
  pathProgress,
  resumeIndex,
  rewardMeaning,
  type Stage,
  type StageStatus,
} from "@/lib/path/stages";
import { cardTypesFor, itemKey } from "@/lib/srs/decks";
import { getLocale, strings } from "@/lib/strings";
import { useSettings } from "@/store/settings";
import { StageIntro } from "./StageIntro";
import { stageTitle } from "./stageText";

interface Loaded {
  library: Library;
  stage: Stage;
  status: StageStatus;
  start: number;
  next: Stage | null;
}

/** /stage/?id=…: a stage's intro, then each item (meet → watch → trace → write), then its reward. */
export function StageFlow() {
  const id = useSearchParams().get("id");
  const [loaded, setLoaded] = useState<Loaded | null | "missing">(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadLibrary(), allItems()]).then(([library, items]) => {
      if (cancelled) return;
      const introduced = new Set(items.map((i) => i.id));
      const progress = pathProgress(library.path, introduced);
      const i = progress.findIndex((p) => p.stage.id === id);
      if (i < 0) return setLoaded("missing");
      setLoaded({
        library,
        stage: progress[i].stage,
        status: progress[i].status,
        start: resumeIndex(progress[i].stage, introduced),
        next: library.path[i + 1] ?? null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loaded === null) return null;
  if (loaded === "missing" || loaded.status === "locked") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-muted">
          {loaded === "missing" ? strings.stage.notFound : strings.stage.locked}
        </p>
        <Link href="/" className="font-medium text-accent">
          {strings.stage.close}
        </Link>
      </div>
    );
  }
  return <StageRunner key={loaded.stage.id} {...loaded} />;
}

type Phase = { kind: "intro" } | { kind: "item"; index: number } | { kind: "reward" };

function StageRunner({ library, stage, start, next }: Loaded) {
  const strictness = useSettings((s) => s.strictness);
  const autoplayAudio = useSettings((s) => s.autoplayAudio);
  // Resuming midway skips the explanation; a fresh (or repeated) stage shows it.
  const [phase, setPhase] = useState<Phase>(
    start > 0 ? { kind: "item", index: start } : { kind: "intro" },
  );
  const returnTo = `/stage/?id=${stage.id}`;
  // Saves still running when the learner leaves the stage.
  const pending = useRef<Promise<unknown>[]>([]);
  const position =
    phase.kind === "item" ? phase.index : phase.kind === "reward" ? stage.items.length : -1;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label={strings.stage.close}
          className="-ml-2 flex h-11 w-11 items-center justify-center text-2xl leading-none text-muted"
        >
          ×
        </Link>
        <ol
          aria-label={stageTitle(stage, library)}
          className="flex flex-1 gap-1.5"
        >
          {stage.items.map((item, i) => (
            <li
              key={item}
              className={`h-2 flex-1 rounded-full ${i < position || (i === position && phase.kind === "item") ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </ol>
      </header>

      {phase.kind === "intro" && (
        <StageIntro
          stage={stage}
          library={library}
          returnTo={returnTo}
          onStart={() => setPhase({ kind: "item", index: 0 })}
        />
      )}

      {phase.kind === "item" && (
        <StageItem
          key={phase.index}
          library={library}
          stage={stage}
          index={phase.index}
          strictness={strictness}
          autoplayAudio={autoplayAudio}
          returnTo={returnTo}
          onLearned={(p) => pending.current.push(p)}
          onNext={() =>
            setPhase(
              phase.index + 1 < stage.items.length
                ? { kind: "item", index: phase.index + 1 }
                : { kind: "reward" },
            )
          }
        />
      )}

      {phase.kind === "reward" && (
        <StageReward
          stage={stage}
          next={next}
          whenSaved={() => Promise.all(pending.current)}
        />
      )}
    </div>
  );
}

function StageItem({
  library,
  stage,
  index,
  strictness,
  autoplayAudio,
  returnTo,
  onLearned,
  onNext,
}: {
  library: Library;
  stage: Stage;
  index: number;
  onLearned: (saving: Promise<unknown>) => void;
  strictness: ReturnType<typeof useSettings.getState>["strictness"];
  autoplayAudio: boolean;
  returnTo: string;
  onNext: () => void;
}) {
  const item = library.items.get(itemKey(stage.deckId, stage.items[index]));
  if (!item) return null;
  return (
    <ItemIntro
      item={item}
      kanji={item.deckId === "kanji-n5" ? library.kanji.get(item.id) : undefined}
      vocab={library.vocab}
      strictness={strictness}
      autoplayAudio={autoplayAudio}
      returnTo={returnTo}
      onLearned={(grade) =>
        onLearned(
          introduceItem(item.deckId, item.id, cardTypesFor(item), grade).catch(console.error),
        )
      }
      onNext={onNext}
    />
  );
}

/** What the stage leaves behind: the characters learned and words to read now. */
function StageReward({
  stage,
  next,
  whenSaved,
}: {
  stage: Stage;
  next: Stage | null;
  whenSaved: () => Promise<unknown>;
}) {
  const router = useRouter();
  const t = strings.stage;
  const locale = getLocale();
  const isWords = stage.section === "words";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-wide text-kun uppercase">{t.rewardTitle}</p>
        {!isWords && (
          <>
            <p className="mt-3 text-sm text-muted">{t.learned}</p>
            <p lang="ja" className="font-hand text-5xl tracking-wider break-all">
              {stage.items.join("")}
            </p>
          </>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">{t.canRead}</h1>
        {stage.rewards.length === 0 ? (
          <p className="text-muted">{t.noWords}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
            {stage.rewards.map((r) => (
              <li key={r.word} className="flex items-center gap-4 px-4 py-3">
                <button
                  type="button"
                  onClick={() => speak(r.reading ?? r.word)}
                  aria-label={t.listen(r.word)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent active:opacity-70"
                >
                  <SpeakerIcon />
                </button>
                <span className="min-w-0">
                  <span lang="ja" className="font-hand block text-3xl">
                    {r.word}
                  </span>
                  <span className="block text-sm text-muted">
                    {r.reading ? `${r.reading} · ` : ""}
                    {toRomaji(toHiragana(r.reading ?? r.word))} · {rewardMeaning(r, locale)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-3">
        {next && (
          <PrimaryButton onClick={() => whenSaved().then(() => router.push(`/stage/?id=${next.id}`))}>
            {t.next}
          </PrimaryButton>
        )}
        <SecondaryButton onClick={() => whenSaved().then(() => router.push("/"))}>
          {t.toPath}
        </SecondaryButton>
      </div>
    </div>
  );
}

