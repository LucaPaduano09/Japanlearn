/**
 * The N5 kanji course: themed lessons, taught in this order, simplest first.
 * Every kanji in kanji-n5.json appears exactly once (see lessons.test.ts).
 */
export interface Lesson {
  id: string;
  /** Key into strings.lessons. */
  title: LessonTitle;
  kanji: string[];
}

export type LessonTitle =
  | "numbers"
  | "week"
  | "nature"
  | "people"
  | "body"
  | "position"
  | "time"
  | "describing"
  | "places"
  | "actions"
  | "learning";

export const LESSONS: Lesson[] = [
  {
    id: "numbers",
    title: "numbers",
    kanji: [..."一二三十四五六七八九百千万円"],
  },
  { id: "week", title: "week", kanji: [..."日月火水木金土"] },
  { id: "nature", title: "nature", kanji: [..."山川天気雨空花魚"] },
  { id: "people", title: "people", kanji: [..."人子女男父母友名"] },
  { id: "body", title: "body", kanji: [..."口目耳手足"] },
  { id: "position", title: "position", kanji: [..."上下中左右外東西南北"] },
  { id: "time", title: "time", kanji: [..."年時分半今午前後先毎週間"] },
  { id: "describing", title: "describing", kanji: [..."大小少多長高安古新白"] },
  { id: "places", title: "places", kanji: [..."国社店駅道電車校"] },
  {
    id: "actions",
    title: "actions",
    kanji: [..."入出行来立休見聞言話食飲買会"],
  },
  { id: "learning", title: "learning", kanji: [..."生学本書読語何"] },
];

export function findLesson(id: string | null): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
