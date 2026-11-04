/** 5-digit lowercase hex of a character's first code point, matching KanjiVG filenames. */
export function charToCodepointHex(char: string): string {
  const cp = char.codePointAt(0);
  if (cp === undefined) throw new Error("empty string has no code point");
  return cp.toString(16).padStart(5, "0");
}
