"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SpeakerIcon } from "@/components/cards/ListenCard";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { speak } from "@/lib/native/tts";
import { strings } from "@/lib/strings";
import { useSettings } from "@/store/settings";

const SLIDES = ["scripts", "sounds", "rows", "words"] as const;

/** Script colors, also told apart by underline style (not by hue alone). */
const SCRIPT = {
  kanji: "text-accent border-b-4 border-accent",
  hiragana: "text-kun border-b-4 border-dotted border-kun",
  katakana: "text-on border-b-4 border-dashed border-on",
} as const;

/** 私はコーヒーを飲みます, split by script. */
const SENTENCE: [string, keyof typeof SCRIPT][] = [
  ["私", "kanji"],
  ["は", "hiragana"],
  ["コーヒー", "katakana"],
  ["を", "hiragana"],
  ["飲", "kanji"],
  ["みます", "hiragana"],
];

const VOWELS: [string, string][] = [
  ["あ", "a"],
  ["い", "i"],
  ["う", "u"],
  ["え", "e"],
  ["お", "o"],
];
const K_ROW: [string, string][] = [
  ["か", "ka"],
  ["き", "ki"],
  ["く", "ku"],
  ["け", "ke"],
  ["こ", "ko"],
];
/** The 41 basic hiragana after the vowels, in table rows (blanks keep the grid). */
const REST = "かきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもや ゆ よらりるれろわ   をん    ";

/**
 * First-run guide (proposal C): the three scripts, the five vowels,
 * consonant + vowel rows, and how sounds make words. Also opened from the
 * profile.
 */
export function Welcome() {
  const router = useRouter();
  const update = useSettings((s) => s.update);
  const [slide, setSlide] = useState(0);
  const t = strings.welcome;
  const last = slide === SLIDES.length - 1;

  const finish = (to: string) => {
    update({ welcomeSeen: true });
    router.push(to);
  };

  let content: ReactNode;
  switch (SLIDES[slide]) {
    case "scripts":
      content = (
        <>
          <Title>{t.scriptsTitle}</Title>
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface px-3 py-6">
            <p lang="ja" className="font-hand text-center text-[1.75rem] leading-relaxed whitespace-nowrap">
              {SENTENCE.map(([text, script], i) => (
                <span key={i} className={SCRIPT[script]}>
                  {text}
                </span>
              ))}
            </p>
            <p className="text-muted">{t.scriptsTranslation}</p>
          </div>
          <ul className="flex flex-col gap-3">
            <ScriptRow glyph="あ" name="Hiragana" text={t.hiragana} style={SCRIPT.hiragana} />
            <ScriptRow glyph="ア" name="Katakana" text={t.katakana} style={SCRIPT.katakana} />
            <ScriptRow glyph="日" name="Kanji" text={t.kanji} style={SCRIPT.kanji} />
          </ul>
        </>
      );
      break;
    case "sounds":
      content = (
        <>
          <Title>{t.soundsTitle}</Title>
          <p className="text-muted">{t.soundsBody}</p>
          <Kana row={VOWELS} highlight />
          <div
            aria-hidden
            className="font-hand grid grid-cols-5 gap-x-2 px-4 text-center text-2xl leading-snug text-muted"
          >
            {[...REST].map((c, i) => (
              <span key={i}>{c.trim()}</span>
            ))}
          </div>
        </>
      );
      break;
    case "rows":
      content = (
        <>
          <Title>{t.rowsTitle}</Title>
          <p className="text-muted">{t.rowsBody}</p>
          <ul className="grid grid-cols-5 gap-2">
            {K_ROW.map(([char, romaji]) => (
              <li
                key={char}
                className="flex flex-col items-center gap-0.5 rounded-2xl border border-border bg-surface py-3"
              >
                <span className="text-xs text-muted">k + {romaji.slice(1)}</span>
                <span lang="ja" className="font-hand text-4xl leading-tight">
                  {char}
                </span>
                <span className="text-sm font-semibold">{romaji}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">{t.rowsNote}</p>
        </>
      );
      break;
    case "words":
      content = (
        <>
          <Title>{t.wordsTitle}</Title>
          <p className="text-muted">{t.wordsBody}</p>
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface py-8">
            <p lang="ja" className="font-hand flex items-center gap-3 text-5xl">
              あ <span className="text-2xl text-muted">+</span> い
              <span className="text-2xl text-muted">=</span>
              <span className="text-accent">あい</span>
            </p>
            <p className="text-2xl font-semibold">ai · {t.wordsMeaning}</p>
            <button
              type="button"
              onClick={() => speak("あい")}
              aria-label={strings.stage.listen("あい")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent active:opacity-70"
            >
              <SpeakerIcon />
            </button>
          </div>
        </>
      );
      break;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-4">
      <header className="flex items-center justify-between">
        <ol className="flex gap-1.5" aria-label={t.position(slide + 1, SLIDES.length)}>
          {SLIDES.map((s, i) => (
            <li
              key={s}
              className={`h-2 rounded-full ${i === slide ? "w-6 bg-accent" : i < slide ? "w-2 bg-accent" : "w-2 bg-border"}`}
            />
          ))}
        </ol>
        <button
          type="button"
          onClick={() => finish("/")}
          className="px-2 py-2 text-sm font-medium text-muted"
        >
          {t.skip}
        </button>
      </header>

      <article className="flex flex-1 flex-col gap-4">{content}</article>

      <footer className="flex gap-3">
        {slide > 0 && (
          <SecondaryButton onClick={() => setSlide(slide - 1)} className="flex-1">
            {t.back}
          </SecondaryButton>
        )}
        <div className="flex-[2]">
          {last ? (
            <PrimaryButton onClick={() => finish("/stage/?id=hira-1")}>{t.start}</PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => setSlide(slide + 1)}>{t.next}</PrimaryButton>
          )}
        </div>
      </footer>
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h1 className="text-3xl leading-tight font-semibold">{children}</h1>;
}

function ScriptRow({
  glyph,
  name,
  text,
  style,
}: {
  glyph: string;
  name: string;
  text: string;
  style: string;
}) {
  return (
    <li className="flex items-center gap-4">
      <span
        lang="ja"
        className={`font-hand flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface text-3xl ${style}`}
      >
        {glyph}
      </span>
      <span>
        <span className="block font-semibold">{name}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
    </li>
  );
}

function Kana({ row, highlight }: { row: [string, string][]; highlight?: boolean }) {
  return (
    <ul
      className={`grid grid-cols-5 gap-2 rounded-3xl p-3 ${highlight ? "border-2 border-accent bg-surface" : ""}`}
    >
      {row.map(([char, romaji]) => (
        <li key={char} className="flex flex-col items-center">
          <span lang="ja" className="font-hand text-4xl leading-tight">
            {char}
          </span>
          <span className="font-semibold text-accent">{romaji}</span>
        </li>
      ))}
    </ul>
  );
}
