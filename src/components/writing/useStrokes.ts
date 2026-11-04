"use client";

import { useEffect, useState } from "react";
import { loadStrokes } from "@/lib/content/loader";
import type { RefStroke } from "@/lib/strokes/types";

/**
 * Reference strokes for each character, in order; null while loading or if
 * any character has no stroke data.
 */
export function useStrokes(chars: string[]): RefStroke[][] | null {
  const key = chars.join("");
  const [loaded, setLoaded] = useState<{
    key: string;
    strokes: RefStroke[][] | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([...key].map(loadStrokes)).then((data) => {
      if (cancelled) return;
      const strokes = data.every((d) => d !== null)
        ? data.map((d) => d.strokes)
        : null;
      setLoaded({ key, strokes });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return loaded?.key === key ? loaded.strokes : null;
}
