import type { Library } from "@/lib/content/library";
import type { Stage } from "@/lib/path/stages";
import { strings } from "@/lib/strings";

/** "K row", "Numbers 2/3", "Words 4"… */
export function stageTitle(stage: Stage, library: Library): string {
  const t = strings.stageTitles;
  const intro = stage.intro;
  switch (intro.kind) {
    case "vowels":
      return t.vowels;
    case "row":
      return t.row(intro.consonant);
    case "y-row":
      return t.yRow;
    case "w-row":
      return stage.section === "katakana" ? t.wRowKatakana : t.wRow;
    case "voiced":
    case "semivoiced": {
      const romaji = library.kana.get(stage.items[0])?.romaji ?? "";
      return t.voiced(romaji.slice(0, -1));
    }
    case "kanji":
      return t.kanji(strings.lessons[intro.lesson], intro.part, intro.parts);
    case "words":
      return t.words(intro.n);
  }
}

/** The characters shown on a stage's card: its kana or kanji, or its first words. */
export function stagePreview(stage: Stage): string {
  return stage.section === "words" ? stage.items.slice(0, 3).join("・") : stage.items.join("");
}
