import { Suspense } from "react";
import { ReadingsIntro } from "@/components/learn/ReadingsIntro";

export default function IntroPage() {
  return (
    <Suspense fallback={null}>
      <ReadingsIntro />
    </Suspense>
  );
}
