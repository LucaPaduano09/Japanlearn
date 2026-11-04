"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KIND_STYLE, WordRow } from "@/components/learn/KanjiMeet";
import { LESSONS } from "@/lib/content/lessons";
import { loadKanjiN5 } from "@/lib/content/loader";
import type { KanjiEntry } from "@/lib/content/types";
import { matchWord, type ReadingKind } from "@/lib/content/wordReadings";
import { strings } from "@/lib/strings";
import { useProgress } from "@/store/progress";

type MeaningKey = keyof typeof strings.intro.meanings;

/** An example word: `char` is the kanji whose reading gets highlighted. */
interface Example {
  char: string;
  expression: string;
  reading: string;
  meaning: MeaningKey;
}

const ex = (
  char: string,
  expression: string,
  reading: string,
  meaning: MeaningKey,
): Example => ({
  char,
  expression,
  reading,
  meaning,
});

const EXAMPLES = {
  both: [
    ex("日", "日", "ひ", "hi"),
    ex("日", "毎日", "まいにち", "mainichi"),
    ex("日", "日曜日", "にちようび", "nichiyoubi"),
  ],
  kun: [
    ex("山", "山", "やま", "yama"),
    ex("食", "食べる", "たべる", "taberu"),
    ex("高", "高い", "たかい", "takai"),
  ],
  on: [
    ex("学", "学生", "がくせい", "gakusei"),
    ex("電", "電車", "でんしゃ", "densha"),
    ex("先", "先生", "せんせい", "sensei"),
  ],
  special: [
    ex("名", "名前", "なまえ", "namae"),
    ex("日", "明日", "あした", "ashita"),
    ex("人", "大人", "おとな", "otona"),
  ],
};

const SLIDES = ["what", "kinds", "both", "rule", "special"] as const;

/** Five short slides on on'yomi vs kun'yomi, before the first lesson. */
export function ReadingsIntro() {
  const [kanji, setKanji] = useState<Map<string, KanjiEntry> | null>(null);
  const [slide, setSlide] = useState(0);
  const learned = useProgress((s) => s.learned);
  const markIntroSeen = useProgress((s) => s.markIntroSeen);

  useEffect(() => {
    useProgress.getState().load();
    loadKanjiN5().then((list) =>
      setKanji(new Map(list.map((k) => [k.char, k]))),
    );
  }, []);

  if (!kanji) return null;

  const t = strings.intro;
  const last = slide === SLIDES.length - 1;
  const started = Object.keys(learned).length > 0;
  const words = (list: Example[]) => <Words list={list} kanji={kanji} />;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-4">
      <header className="flex items-center gap-3">
        <Link
          href="/learn/"
          aria-label={t.close}
          className="-ml-2 px-2 text-2xl leading-none text-muted"
        >
          ×
        </Link>
        <p className="flex-1 text-sm font-medium">{t.title}</p>
        <ol
          className="flex gap-1.5"
          aria-label={`${slide + 1} / ${SLIDES.length}`}
        >
          {SLIDES.map((s, i) => (
            <li
              key={s}
              className={`h-2 w-2 rounded-full ${i <= slide ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </ol>
      </header>

      <article className="flex flex-1 flex-col gap-4">
        {SLIDES[slide] === "what" && (
          <>
            <Title>{t.slides.what.title}</Title>
            <div className="flex items-center justify-center gap-5 py-4">
              <span className="font-hand text-9xl leading-none">山</span>
              <span className="text-2xl text-muted">
                {t.slides.what.example}
              </span>
            </div>
            <Body lines={t.slides.what.body} />
          </>
        )}

        {SLIDES[slide] === "kinds" && (
          <>
            <Title>{t.slides.kinds.title}</Title>
            <Body lines={t.slides.kinds.body} />
            <KindCard kind="on" text={t.slides.kinds.on} sample="ニチ" />
            <KindCard kind="kun" text={t.slides.kinds.kun} sample="ひ" />
            <p className="rounded-xl border border-border bg-surface p-3 text-sm">
              {t.slides.kinds.compare}
            </p>
          </>
        )}

        {SLIDES[slide] === "both" && (
          <>
            <Title>{t.slides.both.title}</Title>
            <Body lines={t.slides.both.body} />
            {words(EXAMPLES.both)}
            <p className="text-sm text-muted">{t.slides.both.note}</p>
          </>
        )}

        {SLIDES[slide] === "rule" && (
          <>
            <Title>{t.slides.rule.title}</Title>
            <RuleBlock kind="kun" title={t.slides.rule.alone}>
              {words(EXAMPLES.kun)}
            </RuleBlock>
            <RuleBlock kind="on" title={t.slides.rule.compound}>
              {words(EXAMPLES.on)}
            </RuleBlock>
            <p className="text-sm text-muted">{t.slides.rule.okurigana}</p>
          </>
        )}

        {SLIDES[slide] === "special" && (
          <>
            <Title>{t.slides.special.title}</Title>
            <Body lines={t.slides.special.body} />
            {words(EXAMPLES.special)}
            <p className="rounded-xl border border-accent/40 bg-surface p-3 text-sm font-medium">
              {t.slides.special.tip}
            </p>
          </>
        )}
      </article>

      <footer className="flex gap-3">
        {slide > 0 && (
          <button
            type="button"
            onClick={() => setSlide(slide - 1)}
            className="flex-1 rounded-2xl border border-border bg-surface py-4 font-medium active:opacity-70"
          >
            {t.back}
          </button>
        )}
        {last ? (
          <Link
            href={started ? "/learn/" : `/learn/lesson/?id=${LESSONS[0].id}`}
            onClick={markIntroSeen}
            className="flex-[2] rounded-2xl bg-accent py-4 text-center text-lg font-semibold text-white active:opacity-80"
          >
            {started ? t.finishSeen : t.finish}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setSlide(slide + 1)}
            className="flex-[2] rounded-2xl bg-accent py-4 text-lg font-semibold text-white active:opacity-80"
          >
            {t.next}
          </button>
        )}
      </footer>
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-semibold">{children}</h1>;
}

function Body({ lines }: { lines: readonly string[] }) {
  return (
    <>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </>
  );
}

/** The on / kun card, in the same colors the lessons use. */
function KindCard({
  kind,
  text,
  sample,
}: {
  kind: ReadingKind;
  text: string;
  sample: string;
}) {
  const style = KIND_STYLE[kind];
  const k = strings.lesson.kinds[kind];
  return (
    <section className={`flex gap-3 rounded-2xl border p-4 ${style.card}`}>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-hand text-2xl text-white ${style.badge}`}
        aria-hidden
      >
        {k.glyph}
      </span>
      <div>
        <h2 className={`font-semibold ${style.text}`}>
          {k.name} <span className="font-normal text-muted">· {k.gloss}</span>
        </h2>
        <p className="text-sm">{text}</p>
        <p className="mt-1 text-sm text-muted">
          日 → <span className={`font-semibold ${style.text}`}>{sample}</span>
        </p>
      </div>
    </section>
  );
}

function RuleBlock({
  kind,
  title,
  children,
}: {
  kind: ReadingKind;
  title: string;
  children: React.ReactNode;
}) {
  const style = KIND_STYLE[kind];
  return (
    <section className={`rounded-2xl border p-3 ${style.card}`}>
      <h2 className={`mb-2 font-semibold ${style.text}`}>{title}</h2>
      {children}
    </section>
  );
}

/** Example words, matched to their reading exactly like in the lessons. */
function Words({
  list,
  kanji,
}: {
  list: Example[];
  kanji: Map<string, KanjiEntry>;
}) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {list.map((e) => {
        const entry = kanji.get(e.char)!;
        const match = matchWord(entry, {
          expression: e.expression,
          reading: e.reading,
          meaning: strings.intro.meanings[e.meaning],
        })!;
        return (
          <WordRow
            key={e.expression}
            match={match}
            char={e.char}
            kind={match.reading?.kind}
          />
        );
      })}
    </ul>
  );
}
