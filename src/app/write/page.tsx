import { Suspense } from "react";
import { WritePractice } from "@/components/writing/WritePractice";

export default function WritePage() {
  return (
    <Suspense fallback={null}>
      <WritePractice />
    </Suspense>
  );
}
