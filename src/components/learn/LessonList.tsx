"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LESSONS } from "@/lib/content/lessons";
import { strings } from "@/lib/strings";
import { useProgress } from "@/store/progress";

/** The kanji course: lessons in order, with per-kanji progress. */
export function LessonList() {
  const learned = useProgress((s) => s.learned);
  const introSeen = useProgress((s) => s.introSeen);
  useEffect(() => {
    useProgress.persist.rehydrate();
  }, []);

  const current = LESSONS.find((l) => l.kanji.some((c) => !learned[c]));
  const started = Object.keys(learned).length > 0;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <h1 className="text-2xl font-semibold">{strings.learn.title}</h1>
      <p className="mt-1 text-muted">{strings.learn.subtitle}</p>

      {!introSeen && !started ? (
        <Link
          href="/learn/intro/"
          className="mt-5 block rounded-2xl bg-accent py-4 text-center text-lg font-semibold text-white active:opacity-80"
        >
          {strings.learn.startHere}
        </Link>
      ) : current ? (
        <Link
          href={`/learn/lesson/?id=${current.id}`}
          className="mt-5 block rounded-2xl bg-accent py-4 text-center text-lg font-semibold text-white active:opacity-80"
        >
          {started
            ? `${strings.learn.continue}: ${strings.lessons[current.title]}`
            : strings.learn.startCourse}
        </Link>
      ) : (
        <p className="mt-5 rounded-2xl border border-border bg-surface p-4 text-center">
          {strings.learn.courseDone}
        </p>
      )}

      <Link
        href="/learn/intro/"
        className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 active:opacity-70"
      >
        <span
          className="flex shrink-0 gap-1 font-hand text-xl text-white"
          aria-hidden
        >
          <span className="rounded-lg bg-on px-1.5">音</span>
          <span className="rounded-lg bg-kun px-1.5">訓</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{strings.learn.introCard}</span>
          <span className="block text-sm text-muted">
            {strings.learn.introCardBody}
          </span>
        </span>
        <span className="text-muted" aria-hidden>
          →
        </span>
      </Link>

      <ol className="mt-3 flex flex-col gap-3">
        {LESSONS.map((lesson, i) => {
          const done = lesson.kanji.filter((c) => learned[c]).length;
          const href = `/learn/lesson/?id=${lesson.id}`;
          const fromStart = `${href}&k=${lesson.kanji[0]}`;
          return (
            <li
              key={lesson.id}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <Link
                href={href}
                className="flex items-baseline justify-between gap-3 active:opacity-70"
              >
                <span className="font-medium">
                  <span className="mr-2 text-muted">{i + 1}.</span>
                  {strings.lessons[lesson.title]}
                </span>
                <span className="text-sm text-muted">
                  {strings.learn.progress(done, lesson.kanji.length)}
                </span>
              </Link>

              {/* Any kanji, learned or not, can be opened (and redone) directly. */}
              <ul className="mt-2 -ml-1.5 flex flex-wrap">
                {lesson.kanji.map((c) => (
                  <li key={c}>
                    <Link
                      href={`${href}&k=${c}`}
                      aria-label={strings.learn.openKanji(c)}
                      className={`block rounded-lg px-1.5 py-0.5 font-hand text-2xl active:bg-border ${
                        learned[c] ? "text-accent" : "text-muted"
                      }`}
                    >
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>

              {done > 0 && (
                <div className="mt-3 flex gap-2 text-sm">
                  {done < lesson.kanji.length && (
                    <Link
                      href={href}
                      className="rounded-full bg-accent px-3 py-1 font-medium text-white active:opacity-80"
                    >
                      {strings.learn.resume}
                    </Link>
                  )}
                  <Link
                    href={fromStart}
                    className="rounded-full border border-border px-3 py-1 font-medium active:opacity-70"
                  >
                    {done < lesson.kanji.length
                      ? strings.learn.restartLesson
                      : strings.learn.review}
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
