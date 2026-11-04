import { strings } from "@/lib/strings";
import { dueIn } from "./queue";

/** "in 10 min", "in 3 days", "now". */
export function formatDue(due: number, now: number): string {
  const d = dueIn(due, now);
  return d.unit === "now" ? strings.dueIn.now : strings.dueIn[d.unit](d.n);
}
