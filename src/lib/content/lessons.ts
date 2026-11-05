/**
 * The kanji course: themed lessons, taught in this order, simplest first.
 * Every kanji in kanji-n5.json appears exactly once in LESSONS, every kanji
 * in kanji-n4.json exactly once in LESSONS_N4 (see lessons.test.ts).
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
  | "learning"
  // N4
  | "family"
  | "seasons"
  | "colors"
  | "land"
  | "food"
  | "health"
  | "town"
  | "moving"
  | "doing"
  | "qualities"
  | "study"
  | "words"
  | "things"
  | "ideas";

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

export const LESSONS_N4: Lesson[] = [
  { id: "n4-family", title: "family", kanji: [..."家族親兄弟姉妹私自者主民"] },
  { id: "n4-seasons", title: "seasons", kanji: [..."春夏秋冬朝昼夕夜曜早去代世"] },
  { id: "n4-colors", title: "colors", kanji: [..."色青赤黒音声味暗明"] },
  { id: "n4-land", title: "land", kanji: [..."海森林池田野風光地洋界"] },
  { id: "n4-food", title: "food", kanji: [..."肉牛鳥犬茶飯菜料"] },
  { id: "n4-health", title: "health", kanji: [..."体頭顔首心力病医薬死"] },
  { id: "n4-town", title: "town", kanji: [..."町村市区県京都屋館院堂室門場所住"] },
  { id: "n4-moving", title: "moving", kanji: [..."歩走乗運転動通進送帰起止急近遠旅"] },
  { id: "n4-doing", title: "doing", kanji: [..."使持借貸売開始終着洗待切引注集作建用"] },
  { id: "n4-qualities", title: "qualities", kanji: [..."悪好弱重軽広短低太寒暑真正同特別楽"] },
  { id: "n4-study", title: "study", kanji: [..."働仕事業員勉強教習研究試験質問答題"] },
  { id: "n4-words", title: "words", kanji: [..."思考知意説文字漢英歌画写映"] },
  { id: "n4-things", title: "things", kanji: [..."物品服紙銀台図工便発産"] },
  { id: "n4-ideas", title: "ideas", kanji: [..."以回元合計不度方有理"] },
];

export function findLesson(id: string | null): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
