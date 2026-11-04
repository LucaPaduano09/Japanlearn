import { Suspense } from "react";
import { KanjiDetail } from "@/components/kanji/KanjiDetail";

export default function KanjiPage() {
  return (
    <Suspense fallback={null}>
      <KanjiDetail />
    </Suspense>
  );
}
