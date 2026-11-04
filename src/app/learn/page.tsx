import { DeckPicker } from "@/components/learn/DeckPicker";
import { LessonList } from "@/components/learn/LessonList";
import { strings } from "@/lib/strings";

export default function LearnPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-6">
      <h1 className="text-2xl font-semibold">{strings.learn.title}</h1>
      <DeckPicker />
      <LessonList />
    </div>
  );
}
