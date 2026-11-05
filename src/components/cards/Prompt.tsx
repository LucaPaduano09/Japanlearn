import type { StudyItem } from "@/lib/srs/decks";
import { hasKanji } from "@/lib/srs/decks";
import { strings } from "@/lib/strings";

/** What a card asks for: a small label above the big cue. */
export function Prompt({
  label,
  cue,
  note,
  japanese = false,
}: {
  label: string;
  cue: string;
  note?: string;
  /** Show the cue in the handwriting font (kana readings). */
  japanese?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-1 font-semibold ${
          japanese ? "font-hand text-3xl" : "text-2xl"
        }`}
      >
        {cue}
      </p>
      {note && <p className="text-sm text-muted">{note}</p>}
    </div>
  );
}

const KATAKANA_WORD = /^[ァ-ヺー]+$/u;

/** Label + cue for a write card that isn't prompted by audio. */
export function writePrompt(
  item: StudyItem,
  type: "write-from-meaning" | "write-from-reading",
): { label: string; cue: string; note?: string; japanese?: boolean } {
  const p = strings.review.prompts;
  switch (item.deckId) {
    case "hiragana":
    case "katakana":
      return {
        label: p.writeKana(strings.review.scripts[item.deckId]),
        cue: item.romaji!,
      };
    case "kanji-n5":
    case "kanji-n4":
      return type === "write-from-meaning"
        ? { label: p.writeKanjiMeaning, cue: item.meaning! }
        : { label: p.writeKanjiReading, cue: item.reading, japanese: true };
    case "vocab-n5":
    case "vocab-n4":
      if (type === "write-from-reading" && hasKanji(item)) {
        return { label: p.writeWordReading, cue: item.reading, japanese: true };
      }
      return {
        label: p.writeWordMeaning,
        cue: item.meaning!,
        note: KATAKANA_WORD.test(item.id) ? p.inKatakana : undefined,
      };
  }
}
