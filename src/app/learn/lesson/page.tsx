import { Suspense } from "react";
import { LessonFlow } from "@/components/learn/LessonFlow";

export default function LessonPage() {
  return (
    <Suspense fallback={null}>
      <LessonFlow />
    </Suspense>
  );
}
