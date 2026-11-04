/**
 * Kana → romaji (modified Hepburn, spelled the way it's pronounced):
 * しゃ → sha, っ doubles the next consonant (きって → kitte, っち → tchi),
 * ん before a vowel or y → n' (きんえん → kin'en), を → o, ー repeats the
 * vowel. Long vowels stay as written (とうきょう → toukyou). Anything that
 * isn't kana (KANJIDIC's "(" ")" "-" markers, punctuation) passes through.
 */

const BASE: Record<string, string> = {
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  さ: "sa",
  し: "shi",
  す: "su",
  せ: "se",
  そ: "so",
  た: "ta",
  ち: "chi",
  つ: "tsu",
  て: "te",
  と: "to",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "fu",
  へ: "he",
  ほ: "ho",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  ゐ: "i",
  ゑ: "e",
  を: "o",
  ん: "n",
  が: "ga",
  ぎ: "gi",
  ぐ: "gu",
  げ: "ge",
  ご: "go",
  ざ: "za",
  じ: "ji",
  ず: "zu",
  ぜ: "ze",
  ぞ: "zo",
  だ: "da",
  ぢ: "ji",
  づ: "zu",
  で: "de",
  ど: "do",
  ば: "ba",
  び: "bi",
  ぶ: "bu",
  べ: "be",
  ぼ: "bo",
  ぱ: "pa",
  ぴ: "pi",
  ぷ: "pu",
  ぺ: "pe",
  ぽ: "po",
  ゔ: "vu",
  ぁ: "a",
  ぃ: "i",
  ぅ: "u",
  ぇ: "e",
  ぉ: "o",
  ゃ: "ya",
  ゅ: "yu",
  ょ: "yo",
  ゎ: "wa",
};

/** Two-kana sounds: youon (きゃ) and the extended katakana ones (ティ, ファ). */
const DIGRAPHS: Record<string, string> = {
  きゃ: "kya",
  きゅ: "kyu",
  きょ: "kyo",
  ぎゃ: "gya",
  ぎゅ: "gyu",
  ぎょ: "gyo",
  しゃ: "sha",
  しゅ: "shu",
  しょ: "sho",
  じゃ: "ja",
  じゅ: "ju",
  じょ: "jo",
  ちゃ: "cha",
  ちゅ: "chu",
  ちょ: "cho",
  ぢゃ: "ja",
  ぢゅ: "ju",
  ぢょ: "jo",
  にゃ: "nya",
  にゅ: "nyu",
  にょ: "nyo",
  ひゃ: "hya",
  ひゅ: "hyu",
  ひょ: "hyo",
  びゃ: "bya",
  びゅ: "byu",
  びょ: "byo",
  ぴゃ: "pya",
  ぴゅ: "pyu",
  ぴょ: "pyo",
  みゃ: "mya",
  みゅ: "myu",
  みょ: "myo",
  りゃ: "rya",
  りゅ: "ryu",
  りょ: "ryo",
  しぇ: "she",
  じぇ: "je",
  ちぇ: "che",
  てぃ: "ti",
  でぃ: "di",
  とぅ: "tu",
  ふぁ: "fa",
  ふぃ: "fi",
  ふぇ: "fe",
  ふぉ: "fo",
  うぃ: "wi",
  うぇ: "we",
  うぉ: "wo",
  ゔぁ: "va",
  ゔぃ: "vi",
  ゔぇ: "ve",
  ゔぉ: "vo",
};

const KATAKANA_START = 0x30a1; // ァ
const KATAKANA_END = 0x30f6; // ヶ
const KANA_OFFSET = 0x60;

/** Folds katakana into hiragana so one table covers both. */
export function toHiragana(text: string): string {
  return [...text]
    .map((c) => {
      const cp = c.codePointAt(0)!;
      return cp >= KATAKANA_START && cp <= KATAKANA_END
        ? String.fromCodePoint(cp - KANA_OFFSET)
        : c;
    })
    .join("");
}

export function toRomaji(kana: string): string {
  const chars = [...toHiragana(kana)];
  let out = "";
  let geminate = false;

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === "っ") {
      geminate = true;
      continue;
    }
    if (c === "ー") {
      out += out.match(/[aeiou]$/)?.[0] ?? "";
      continue;
    }

    let syllable: string | undefined = DIGRAPHS[c + (chars[i + 1] ?? "")];
    if (syllable) i++;
    else syllable = BASE[c];
    if (syllable === undefined) {
      out += c; // not kana: keep as is
      geminate = false;
      continue;
    }

    if (c === "ん" && /^[aiueoy]/.test(romajiAt(chars, i + 1))) syllable = "n'";
    if (geminate) {
      syllable = (syllable.startsWith("ch") ? "t" : syllable[0]) + syllable;
      geminate = false;
    }
    out += syllable;
  }
  return out;
}

/** Romaji of the kana starting at `i` (for the ん lookahead). */
function romajiAt(chars: string[], i: number): string {
  return (
    DIGRAPHS[(chars[i] ?? "") + (chars[i + 1] ?? "")] ??
    BASE[chars[i] ?? ""] ??
    ""
  );
}
