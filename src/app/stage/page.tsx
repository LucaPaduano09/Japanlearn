import { Suspense } from "react";
import { StageFlow } from "@/components/path/StageFlow";

export default function StagePage() {
  return (
    <Suspense fallback={null}>
      <StageFlow />
    </Suspense>
  );
}
