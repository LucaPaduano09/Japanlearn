"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadLibrary, type Library } from "@/lib/content/library";
import { activityTimes, allItems, countDue } from "@/lib/db/repo";
import {
  pathProgress,
  SECTIONS,
  type Section,
  type StageProgress,
} from "@/lib/path/stages";
import { streak } from "@/lib/srs/queue";
import { strings } from "@/lib/strings";
import { useSettings } from "@/store/settings";
import { stagePreview, stageTitle } from "./stageText";

/** Locked stages shown after the current one; the rest are summarized. */
const LOCKED_SHOWN = 2;
/** Completed stages shown before the current one; the rest fold away. */
const DONE_SHOWN = 1;

interface Data {
  library: Library;
  progress: StageProgress[];
  due: number;
  streak: number;
}

/** Home: the learning path, one stage after the other (proposal A). */
export function PathScreen() {
  const router = useRouter();
  const welcomeSeen = useSettings((s) => s.welcomeSeen);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    Promise.all([loadLibrary(), allItems(), countDue(now), activityTimes()]).then(
      ([library, items, due, times]) => {
        if (cancelled) return;
        // First run: how Japanese works, before anything else.
        if (!welcomeSeen && items.length === 0) {
          router.replace("/welcome/");
          return;
        }
        setData({
          library,
          progress: pathProgress(library.path, new Set(items.map((i) => i.id))),
          due,
          streak: streak(times, now),
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [router, welcomeSeen]);

  if (!data) return null;
  const t = strings.path;
  const current = data.progress.find((p) => p.status === "current");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        {data.streak > 0 && (
          <p className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
            {t.streak(data.streak)}
          </p>
        )}
      </header>

      {data.due > 0 && (
        <Link
          href="/review/"
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 active:opacity-70"
        >
          <span className="flex items-center gap-3">
            <span className="font-hand text-2xl text-accent" aria-hidden>
              復
            </span>
            <span className="font-medium">{t.due(data.due)}</span>
          </span>
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white">
            {t.reviewNow}
          </span>
        </Link>
      )}

      {!current && (
        <p className="rounded-2xl border border-border bg-surface p-4 text-center">
          {t.allDone}
        </p>
      )}

      {SECTIONS.map((section) => (
        <PathSection
          key={section}
          section={section}
          stages={data.progress.filter((p) => p.stage.section === section)}
          library={data.library}
          numberOf={(p) => data.progress.indexOf(p) + 1}
        />
      ))}
    </div>
  );
}

function PathSection({
  section,
  stages,
  library,
  numberOf,
}: {
  section: Section;
  stages: StageProgress[];
  library: Library;
  numberOf: (p: StageProgress) => number;
}) {
  const [showDone, setShowDone] = useState(false);
  const t = strings.path;
  const done = stages.filter((s) => s.status === "done");
  const currentIndex = stages.findIndex((s) => s.status === "current");
  const allDone = done.length === stages.length;
  const allLocked = stages.every((s) => s.status === "locked");

  let visible: StageProgress[];
  let hiddenDone = 0;
  let hiddenLocked = 0;
  if (allLocked) {
    visible = [];
    hiddenLocked = stages.length;
  } else if (allDone) {
    visible = showDone ? stages : [];
    hiddenDone = showDone ? 0 : stages.length;
  } else {
    const firstShown = showDone ? 0 : Math.max(0, currentIndex - DONE_SHOWN);
    const lastShown = currentIndex + LOCKED_SHOWN;
    visible = stages.slice(firstShown, lastShown + 1);
    hiddenDone = firstShown;
    hiddenLocked = Math.max(0, stages.length - lastShown - 1);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-baseline justify-between">
        <span className="flex items-center gap-2 text-lg font-semibold">
          {allDone && <CheckIcon className="h-5 w-5 text-kun" />}
          {t.sections[section]}
        </span>
        <span className="text-sm text-muted">
          {t.sectionProgress(done.length, stages.length)}
        </span>
      </h2>

      {hiddenDone > 0 && (
        <button
          type="button"
          onClick={() => setShowDone(true)}
          className="self-start text-sm font-medium text-accent"
        >
          {t.showDone(hiddenDone)}
        </button>
      )}
      {showDone && done.length > 0 && (
        <button
          type="button"
          onClick={() => setShowDone(false)}
          className="self-start text-sm font-medium text-accent"
        >
          {t.hideDone}
        </button>
      )}

      {visible.length > 0 && (
        <ol className="flex flex-col gap-3">
          {visible.map((p) => (
            <li key={p.stage.id}>
              <StageCard progress={p} library={library} number={numberOf(p)} />
            </li>
          ))}
        </ol>
      )}

      {hiddenLocked > 0 && (
        <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          {t.moreStages(hiddenLocked)}
        </p>
      )}
    </section>
  );
}

function StageCard({
  progress,
  library,
  number,
}: {
  progress: StageProgress;
  library: Library;
  number: number;
}) {
  const t = strings.path;
  const { stage, status, done } = progress;
  const href = `/stage/?id=${stage.id}`;
  const title = stageTitle(stage, library);
  const preview = stagePreview(stage);

  if (status === "current") {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border-2 border-accent bg-surface p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-white">
            {number}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-accent">
              {t.stage(number)} · {t.now}
            </p>
            <p className="font-medium">{title}</p>
          </div>
        </div>
        <p lang="ja" className="font-hand truncate text-4xl tracking-wider">
          {preview}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={stage.items.length}
          aria-valuenow={done}
          aria-label={title}
          className="h-2 overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${(done / stage.items.length) * 100}%` }}
          />
        </div>
        <Link
          href={href}
          className="flex h-14 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-white active:opacity-80"
        >
          {done > 0 ? t.continue : t.start}
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <Link
        href={href}
        className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3 active:opacity-70"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-kun text-white">
          <CheckIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-muted">{title}</span>
          <span lang="ja" className="font-hand block truncate text-2xl tracking-wider">
            {preview}
          </span>
        </span>
        <span className="text-sm font-medium text-accent">{t.redo}</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border px-4 py-3 text-muted">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-border/60">
        <LockIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm">{title}</span>
        <span lang="ja" className="font-hand block truncate text-2xl tracking-wider">
          {preview}
        </span>
      </span>
    </div>
  );
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12l5 5L19 7" />
    </svg>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
